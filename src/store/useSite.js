import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import defaultContent from '../data/defaultContent'
import { seedMemberships, seedTransactions, seedPledges, seedBudgets, TIER_FEES, LEGACY_TIER_FEES, migrateTier } from '../data/seedData'
import { seedAccounts, seedGrants, fundForCategory } from '../data/accounts'
import { transactionToVoucher, nextVoucherNo, suggestGrant } from '../lib/accounting'
import { buildBooks, DEFAULT_ADMIN_USERS, migratePersisted, STORE_VERSION } from './migrations'

export { quickLedgerToTransactions } from './migrations' // re-exported: lives with the migrations now
import { v4 as uuidv4 } from 'uuid'
import { uid, hexToRgbString, mixHex, get, setImmutable } from '../lib/utils'
import { defaultNotifications, deliverSubmission } from '../lib/notifications'
import { SEEDED_PASSWORD, defaultMaintenance } from '../lib/production'
import { defaultAnalytics } from '../lib/analytics'

/**
 * BOOKS: every finance transaction posts a balanced voucher.
 * The transaction stays the record the rest of the app talks to (donations,
 * renewals, manual entries); the voucher is what the accounting engine reads.
 * Editing a transaction re-posts its voucher, deleting one removes it.
 */
const voucherFor = (txn, vouchers = [], grants = []) => {
  const existing = vouchers.find((v) => v.sourceId === txn.id)
  const draft = transactionToVoucher(txn, existing?.no || '')
  if (!draft.no) draft.no = nextVoucherNo(vouchers, draft.type, txn.date)
  return {
    ...draft,
    id: existing?.id || uuidv4(),
    grantId: existing?.grantId || suggestGrant(draft, grants),
  }
}

const upsertVoucher = (txn, vouchers, grants) => {
  if (!txn) return vouchers
  const v = voucherFor(txn, vouchers, grants)
  return [v, ...vouchers.filter((x) => x.sourceId !== txn.id)]
    .sort((a, b) => String(b.date).localeCompare(String(a.date)))
}

const seedFinance = () => {
  const transactions = seedTransactions()
  const grants = seedGrants()
  return { transactions, accounts: seedAccounts(), grants, vouchers: buildBooks(transactions, grants), receipts: [] }
}

/** The audit trail is capped so it can never outgrow localStorage. */
const AUDIT_CAP = 500

const seedSubmissions = () => {
  const now = Date.now()
  const hour = 3600000
  return [
    { id: uid('sub'), kind: 'contact', name: 'Demo Enquiry', email: 'demo@example.com', phone: '9876500003', message: 'Interested in a school partnership in Mohali.', date: new Date(now - 3 * hour).toISOString(), status: 'new', demo: true },
    { id: uid('sub'), kind: 'volunteer', name: 'Demo Volunteer', email: 'demo2@example.com', phone: '9876500004', message: 'Weekends, spoken English + maths.', date: new Date(now - 27 * hour).toISOString(), status: 'new', demo: true },
  ]
}

export const defaultAiSettings = {
  enabled: true,
  // "offline" = on-device retrieval over your content (no key, no cost).
  // Any provider below = real LLM call from the browser with your own key.
  provider: 'offline',
  baseUrl: 'https://api.openai.com/v1',
  model: 'gpt-4o-mini',
  apiKey: '',
  temperature: 0.4,
  personaName: 'KSO Assistant',
  systemPrompt:
    "You are the official assistant for Kuki Students' Organisation Chandigarh (KSO), a non-profit in Chandigarh, India. " +
    'Answer warmly and concisely (2-4 sentences, short paragraphs). Use the CONTEXT below as the source of truth. ' +
    'If the answer is not in the context, say so plainly and suggest emailing the team. ' +
    'Never invent registration numbers, bank details, statistics or people. ' +
    'For donations, be helpful but never pressuring. Reply in the language the visitor writes in.',
  greeting: 'Namaste! 👋 I can answer questions about KSO’s work, donations, volunteering and events.',
  suggestions: [
    'How do I volunteer?',
    'Where does my donation go?',
    'Is my donation tax deductible?',
    'Upcoming events',
  ],
  extraKnowledge: '',
}

const initialTheme = {
  brand: '#0f766e',
  accent: '#f59e0b',
  radius: 'rounded-2xl',
}

/** Push the chosen hex colours into CSS custom properties (Tailwind reads them). */
export function applyTheme(theme = initialTheme) {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  const brand = theme.brand || initialTheme.brand
  const accent = theme.accent || initialTheme.accent
  ;[
    ['--brand-50', mixHex(brand, '#ffffff', 0.94)],
    ['--brand-100', mixHex(brand, '#ffffff', 0.86)],
    ['--brand-200', mixHex(brand, '#ffffff', 0.7)],
    ['--brand-300', mixHex(brand, '#ffffff', 0.48)],
    ['--brand-400', mixHex(brand, '#ffffff', 0.24)],
    ['--brand-500', brand],
    ['--brand-600', mixHex(brand, '#000000', 0.18)],
    ['--brand-700', mixHex(brand, '#000000', 0.32)],
    ['--brand-800', mixHex(brand, '#000000', 0.46)],
    ['--brand-900', mixHex(brand, '#000000', 0.6)],
    ['--accent-400', mixHex(accent, '#ffffff', 0.24)],
    ['--accent-500', accent],
    ['--accent-600', mixHex(accent, '#000000', 0.18)],
  ].forEach(([k, v]) => {
    const rgb = hexToRgbString(v)
    if (rgb) root.style.setProperty(k, rgb)
  })
}

export const useSite = create(
  persist(
    (set, getState) => ({
      version: 1,
      content: defaultContent,
      theme: initialTheme,
      settings: {
        logo: '/ksochd-logo.jpg',
        adminUsers: DEFAULT_ADMIN_USERS,
        aiWidgetEnabled: true,
        showDemoBadge: true,
  sessionTimeoutMinutes: 30,
  productionMode: false,
  maintenance: defaultMaintenance(),
  analytics: defaultAnalytics(),
  notifications: defaultNotifications(),
      },
      ai: defaultAiSettings,
      audit: [],   // append-only trail of who changed what (see logAction)
      ledger: [], // retired in v6 — kept only so old data can be migrated forward
      memberships: seedMemberships(),
      pledges: seedPledges(),
      budgets: seedBudgets(),
      ...seedFinance(),
      submissions: seedSubmissions(),
      authed: false,
      currentUser: null,
      mustChangePassword: false,

      /* ---------------- content ---------------- */
      /**
       * Append to the audit trail.
       *
       * Two rules keep it useful rather than noisy:
       *  - a burst of edits to the same thing (typing in a content field) collapses into
       *    ONE entry whose timestamp keeps moving, instead of one row per keystroke;
       *  - the trail is capped, newest first, so it cannot grow without bound.
       *
       * Nothing deletes an entry. That is deliberate: the point of the trail is that it
       * outlives the person who wrote it.
       */
      logAction: (action, target = '', detail = '') =>
        set((s) => {
          const at = new Date().toISOString()
          const actor = s.currentUser?.email || 'unknown'
          const head = (s.audit || [])[0]
          if (head && head.action === action && head.target === target && head.actor === actor
              && Date.parse(at) - Date.parse(head.at) < 5000) {
            return {
              audit: [{ ...head, at, detail, count: (head.count || 1) + 1 }, ...(s.audit || []).slice(1)],
            }
          }
          return {
            audit: [{ id: uid('log'), at, actor, action, target, detail, count: 1 }, ...(s.audit || [])].slice(0, AUDIT_CAP),
          }
        }),

      setContentPath: (path, value) => {
        getState().logAction('edited content', path, String(value ?? '').slice(0, 60))
        set((s) => ({ content: setImmutable(s.content, path, value) }))
      },

      setContent: (updater) =>
        set((s) => ({ content: typeof updater === 'function' ? updater(s.content) : updater })),

      addListItem: (path, item) => {
        getState().logAction('added to', path)
        set((s) => {
          const list = get(s.content, path, []) || []
          return { content: setImmutable(s.content, path, [...list, { id: uid('item'), ...item }]) }
        })
      },

      updateListItem: (path, id, patch) =>
        set((s) => {
          const list = get(s.content, path, []) || []
          return {
            content: setImmutable(
              s.content,
              path,
              list.map((i) => (String(i.id) === String(id) ? { ...i, ...patch } : i)),
            ),
          }
        }),

      removeListItem: (path, id) => {
        getState().logAction('removed from', path)
        set((s) => {
          const list = get(s.content, path, []) || []
          return {
            content: setImmutable(
              s.content,
              path,
              list.filter((i) => String(i.id) !== String(id)),
            ),
          }
        })
      },

      moveListItem: (path, index, dir) => {
        getState().logAction('reordered', path)
        set((s) => {
          const list = [...(get(s.content, path, []) || [])]
          const target = index + dir
          if (target < 0 || target >= list.length) return {}
          ;[list[index], list[target]] = [list[target], list[index]]
          return { content: setImmutable(s.content, path, list) }
        })
      },

      /* ---------------- theme + settings ---------------- */
      setTheme: (patch) =>
        set((s) => {
          const theme = { ...s.theme, ...patch }
          applyTheme(theme)
          return { theme }
        }),

      setSettings: (patch) => {
        getState().logAction('changed settings', Object.keys(patch).join(', '))
        set((s) => ({ settings: { ...s.settings, ...patch } }))
      },

      setAi: (patch) => set((s) => ({ ai: { ...s.ai, ...patch } })),

      /* ------- membership + finance rows (generic CRUD) ------- */
      addRow: (kind, row) => {
        const record = { id: uuidv4(), createdAt: new Date().toISOString().slice(0, 10), ...row }
        getState().logAction('created', kind, record.party || record.name || record.donor || record.no || record.id)
        set((s) => {
          const next = { [kind]: [record, ...(s[kind] || [])] }
          return kind === 'transactions'
            ? { ...next, vouchers: upsertVoucher(record, s.vouchers || [], s.grants || []) }
            : next
        })
        return record
      },
      updateRow: (kind, id, patch) => {
        getState().logAction('updated', kind, `${Object.keys(patch).join(', ')}`)
        set((s) => {
          const rows = (s[kind] || []).map((r) => (r.id === id ? { ...r, ...patch } : r))
          if (kind !== 'transactions') return { [kind]: rows }
          return {
            [kind]: rows,
            vouchers: upsertVoucher(rows.find((r) => r.id === id), s.vouchers || [], s.grants || []),
          }
        })
      },
      removeRow: (kind, id) => {
        const gone = (getState()[kind] || []).find((r) => r.id === id)
        getState().logAction('deleted', kind, gone?.party || gone?.name || gone?.donor || gone?.no || id)
        set((s) => {
          const next = { [kind]: (s[kind] || []).filter((r) => r.id !== id) }
          if (kind !== 'transactions') return next
          return { ...next, vouchers: (s.vouchers || []).filter((v) => v.sourceId !== id) }
        })
      },
      setRows: (kind, rows) => set(() => ({ [kind]: rows })),
      clearDemoRows: () =>
        set((s) => {
          const strip = (rows) => (rows || []).filter((r) => !r.demo)
          return {
            memberships: strip(s.memberships),
            transactions: strip(s.transactions),
            pledges: strip(s.pledges),
            budgets: strip(s.budgets),
            accounts: strip(s.accounts),
            vouchers: strip(s.vouchers),
            grants: strip(s.grants),
            receipts: strip(s.receipts),
          }
        }),
      resetDemoRows: () => {
        if (getState().settings?.productionMode) return false
        set({
          memberships: seedMemberships(),
          pledges: seedPledges(),
          budgets: seedBudgets(),
          ...seedFinance(),
        })
        getState().logAction('re-seeded demo data')
        return true
      },

      /* ---------------- submissions ---------------- */
      /**
       * Kept as the single choke point for incoming messages: every form funnels here,
       * so logging and delivery cannot be forgotten by a page that adds a new form later.
       */
      addSubmission: (row) => {
        const record = { id: uid('sub'), date: new Date().toISOString(), status: 'new', ...row }
        set((s) => ({ submissions: [record, ...(s.submissions || [])] }))
        getState().logAction('received a submission', record.kind || 'contact', record.email || record.name || '')
        // Fire and forget. A delivery failure must never lose the message — it is in the Inbox.
        deliverSubmission(record, getState().settings?.notifications).then((res) => {
          if (res && res.ok === false) console.warn('Submission could not be delivered:', res.error)
        })
      },
      updateSubmission: (id, patch) =>
        set((s) => ({ submissions: s.submissions.map((m) => (m.id === id ? { ...m, ...patch } : m)) })),
      removeSubmission: (id) => set((s) => ({ submissions: s.submissions.filter((m) => m.id !== id) })),
      clearSubmissions: () => set({ submissions: [] }),

      /* ---------------- auth ---------------- */
      login: (email, password) => {
        const users = getState().settings.adminUsers || []
        const user = users.find(
          (u) => u.email.toLowerCase() === String(email || '').trim().toLowerCase()
            && u.password === password,
        )
        if (!user) return false
        // Production mode will not leave an account on the password that ships in the README.
        const onSeededPassword = password === SEEDED_PASSWORD
        set({
          authed: true,
          currentUser: { email: user.email, name: user.name, role: user.role },
          mustChangePassword: Boolean(getState().settings?.productionMode && onSeededPassword),
        })
        getState().logAction('signed in')
        return true
      },
      addAdminUser: (user) => {
        getState().logAction('added admin account', user?.email || '')
        set((s) => ({
          settings: {
            ...s.settings,
            adminUsers: [...(s.settings.adminUsers || []), { role: 'Editor', ...user }],
          },
        }))
      },
      updateAdminUser: (email, patch) =>
        set((s) => ({
          settings: {
            ...s.settings,
            adminUsers: (s.settings.adminUsers || []).map((u) => (u.email === email ? { ...u, ...patch } : u)),
          },
        })),
      removeAdminUser: (email) => {
        getState().logAction('removed admin account', email)
        set((s) => ({
          settings: {
            ...s.settings,
            adminUsers: (s.settings.adminUsers || []).filter((u) => u.email !== email),
          },
        }))
      },
      changeOwnPassword: (current, next) => {
        const state = getState()
        const me = state.currentUser?.email
        const users = state.settings.adminUsers || []
        const match = users.find((u) => u.email === me && u.password === current)
        if (!match) return false
        set((s) => ({
          settings: {
            ...s.settings,
            adminUsers: (s.settings.adminUsers || []).map((u) => (u.email === me ? { ...u, password: next } : u)),
          },
          mustChangePassword: false,
        }))
        getState().logAction('changed their password')
        return true
      },
      logout: () => {
        getState().logAction('signed out')
        set({ authed: false, currentUser: null, mustChangePassword: false })
      },

      /* ---------------- bulk ---------------- */
      exportAll: () => {
        const s = getState()
        return JSON.stringify(
          { version: s.version, content: s.content, theme: s.theme, settings: s.settings, ai: s.ai,
            memberships: s.memberships, transactions: s.transactions, pledges: s.pledges, budgets: s.budgets,
            accounts: s.accounts, vouchers: s.vouchers, grants: s.grants, receipts: s.receipts,
            submissions: s.submissions },
          null,
          2,
        )
      },

      importAll: (json) => {
        try {
          const data = typeof json === 'string' ? JSON.parse(json) : json
          if (!data || typeof data !== 'object') throw new Error('Invalid file')
          set((s) => ({
            content: { ...defaultContent, ...(data.content || {}) },
            theme: { ...initialTheme, ...(data.theme || {}) },
            settings: { ...s.settings, ...(data.settings || {}) },
            ai: { ...defaultAiSettings, ...(data.ai || {}) },
            memberships: Array.isArray(data.memberships) ? data.memberships : s.memberships,
            transactions: Array.isArray(data.transactions) ? data.transactions : s.transactions,
            pledges: Array.isArray(data.pledges) ? data.pledges : s.pledges,
            budgets: Array.isArray(data.budgets) ? data.budgets : s.budgets,
            accounts: Array.isArray(data.accounts) ? data.accounts : s.accounts,
            vouchers: Array.isArray(data.vouchers) ? data.vouchers : s.vouchers,
            grants: Array.isArray(data.grants) ? data.grants : s.grants,
            receipts: Array.isArray(data.receipts) ? data.receipts : s.receipts,
            submissions: Array.isArray(data.submissions) ? data.submissions : s.submissions,
          }))
          applyTheme({ ...initialTheme, ...(data.theme || {}) })
          return { ok: true }
        } catch (e) {
          return { ok: false, error: e.message }
        }
      },

      resetEverything: () => {
        set({
          content: defaultContent,
          theme: initialTheme,
          ai: defaultAiSettings,
          ledger: [], // retired in v6 — kept only so old data can be migrated forward
          memberships: seedMemberships(),
          pledges: seedPledges(),
          budgets: seedBudgets(),
          ...seedFinance(),
          submissions: seedSubmissions(),
        })
        applyTheme(initialTheme)
      },

      clearDemoData: () =>
        set((s) => ({
          submissions: s.submissions.filter((m) => !m.demo),
          memberships: (s.memberships || []).filter((r) => !r.demo),
          transactions: (s.transactions || []).filter((r) => !r.demo),
          pledges: (s.pledges || []).filter((r) => !r.demo),
          budgets: (s.budgets || []).filter((r) => !r.demo),
          settings: { ...s.settings, showDemoBadge: false },
        })),
    }),
    {
      name: 'kso-site-store-v2',
      storage: createJSONStorage(() => localStorage),
      version: STORE_VERSION,
      migrate: migratePersisted,
      partialize: (s) => ({
        content: s.content,
        theme: s.theme,
        settings: s.settings,
        ai: s.ai,
        memberships: s.memberships,
        transactions: s.transactions,
        pledges: s.pledges,
        budgets: s.budgets,
        accounts: s.accounts,
        vouchers: s.vouchers,
        grants: s.grants,
        receipts: s.receipts,
        submissions: s.submissions,
        audit: s.audit,
        // note: `authed` intentionally not persisted — you sign in each session
      }),
      onRehydrateStorage: () => (state) => {
        if (state?.theme) applyTheme(state.theme)
      },
    },
  ),
)

/** Convenience selectors */
export const useContent = () => useSite((s) => s.content)

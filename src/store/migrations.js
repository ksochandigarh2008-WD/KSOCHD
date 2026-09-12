/**
 * STORE MIGRATIONS
 *
 * Every shape change to the persisted store lives here as one numbered step.
 * The whole pipeline is exported as a pure function (`migratePersisted`) so it
 * can be exercised without a browser — see "Store migrations" in tests/run-ssr.mjs.
 *
 * Contract:
 *   - Never mutate the object handed in; return a new one.
 *   - Steps run in order and FALL THROUGH: a v1 blob must end up fully v7.
 *     (An early `return` in one step used to strand old stores half-migrated.)
 *   - Every step must be safe to run on already-migrated data (idempotent),
 *     because the version stamp is written by zustand *after* this runs.
 */
import { v4 as uuidv4 } from 'uuid'
import { TIER_FEES, LEGACY_TIER_FEES, migrateTier } from '../data/seedData'
import { seedAccounts, seedGrants, fundForCategory } from '../data/accounts'
import { transactionToVoucher, nextVoucherNo, suggestGrant } from '../lib/accounting'

/** Build vouchers for a whole transaction list (seeding and migration). */
export const buildBooks = (txns = [], grants = []) => {
  const out = []
  for (const t of [...txns].sort((a, b) => String(a.date).localeCompare(String(b.date)))) {
    const draft = transactionToVoucher(t, '')
    draft.id = uuidv4()
    draft.no = nextVoucherNo(out, draft.type, t.date)
    draft.grantId = suggestGrant(draft, grants)
    out.push(draft)
  }
  return out.sort((a, b) => String(b.date).localeCompare(String(a.date)))
}

/**
 * ADMIN ACCOUNTS. Seeded with one signatory — change it in Admin → System → Security
 * before this goes anywhere public.
 *
 * NOTE: these are checked in the browser, which is fine for keeping casual visitors
 * out and useless against anyone who opens devtools. Real protection needs your
 * backend to gate /admin (see DEPLOY.md → "Securing the admin").
 */
export const DEFAULT_ADMIN_USERS = [
  { email: 'admin@ksochd.org', password: 'ksochd2026', name: 'KSO Administrator', role: 'Admin' },
]

/** Years to show in the budget financial-year picker (newest first). */
const pad2 = (n) => String(n).padStart(2, '0')

/**
 * v6: the quick ledger is retired. Its rows become real transactions so there is
 * exactly one store of money in the app (transactions → vouchers → statements).
 * Exported and pure so the conversion can be tested without a browser.
 */
export const quickLedgerToTransactions = (rows = []) =>
  rows
    .filter((r) => r && Number(r.amount))
    .map((r) => {
      const type = r.type === 'expense' ? 'expense' : 'income'
      const category = type === 'income' ? 'Donation' : 'Program expense'
      return {
        id: uuidv4(),
        date: r.date || new Date().toISOString().slice(0, 10),
        type,
        category,
        amount: Number(r.amount),
        program: r.program || '',
        party: r.donor || r.note || 'Quick entry',
        method: r.method || 'UPI',
        reference: '',
        status: 'Cleared',
        note: r.note ? `${r.note} (migrated from quick ledger)` : 'Migrated from quick ledger',
        memberId: '',
        fund: fundForCategory(category),
        migratedFrom: 'quick-ledger',
        demo: Boolean(r.demo),
      }
    })

/** A calendar year (2026) mapped to its financial year label (2026-27). */
export const fyFromYear = (year) => `${year}-${pad2((Number(year) + 1) % 100)}`

/**
 * Run every pending migration step against a persisted snapshot.
 * Pure: the input is copied, never written to.
 */
export const migratePersisted = (persisted, version) => {
  if (!persisted || typeof persisted !== 'object') return persisted
  let next = { ...persisted }
  const from = Number(version) || 0

  // v1 → v2: a flat `members` roster becomes full membership records.
  if (from < 2) {
    const old = next.members || []
    const converted = old.map((m) => ({
      id: m.id || uuidv4(),
      memberNo: `KSO-${String(Math.random()).slice(2, 6)}`,
      name: m.name || '',
      email: m.email || '',
      phone: m.phone || '',
      type: 'Volunteer',
      tier: 'Individual',
      status: m.status === 'Active' ? 'Active' : 'Pending',
      joined: m.joined || new Date().toISOString().slice(0, 10),
      renewsOn: '',
      centre: 'Central office',
      skills: m.role || '',
      feeAmount: 500,
      feeCycle: 'annual',
      household: [],
      city: '',
      notes: 'Migrated from the v1 roster',
      eventsAttended: 0,
    }))
    const { members, ...rest } = next
    next = { ...rest, memberships: next.memberships?.length ? next.memberships : converted }
  }

  // v2 → v3: the tier list narrowed to Individual / Family, and Family gained households.
  if (from < 3 && Array.isArray(next.memberships)) {
    next.memberships = next.memberships.map((m) => {
      const tier = migrateTier(m.tier)
      const fee = Number(m.feeAmount || 0)
      const legacyFee = LEGACY_TIER_FEES[m.tier]
      return {
        ...m,
        tier,
        // Only re-price fees that were left at the old tier default; hand-edited fees survive.
        feeAmount: legacyFee && fee === legacyFee ? TIER_FEES[tier] : fee,
        feeCycle: m.feeCycle === 'one-time' ? 'annual' : (m.feeCycle || 'annual'),
        household: tier === 'Family' ? (m.household || []) : [],
      }
    })
  }

  // v3 → v4: the double-entry books arrive. Derive vouchers from whatever
  // transactions already exist, and seed the chart of accounts + grants.
  if (from < 4) {
    if (!Array.isArray(next.accounts) || !next.accounts.length) next.accounts = seedAccounts()
    if (!Array.isArray(next.grants) || !next.grants.length) next.grants = seedGrants()
    const own = (next.vouchers || []).filter((v) => v.source !== 'transaction')
    next.vouchers = [...buildBooks(next.transactions || [], next.grants), ...own]
    if (!Array.isArray(next.receipts)) next.receipts = []
  }

  // v4 → v5: the shared passcode is replaced by named accounts.
  if (from < 5) {
    const settings = next.settings || {}
    if (!Array.isArray(settings.adminUsers) || !settings.adminUsers.length) {
      next.settings = { ...settings, adminUsers: [...DEFAULT_ADMIN_USERS] }
    }
  }

  // v5 → v6: one store of money. Legacy quick-ledger rows become
  // transactions, then the ledger is emptied so it can never re-migrate.
  if (from < 6) {
    const legacy = Array.isArray(next.ledger) ? next.ledger : []
    if (legacy.length) {
      const alreadyMigrated = (next.transactions || []).some((t) => t.migratedFrom === 'quick-ledger')
      if (!alreadyMigrated) {
        next.transactions = [...quickLedgerToTransactions(legacy), ...(next.transactions || [])]
      }
    }
    next.ledger = []
  }

  // v6 → v7: budgets move from calendar years to financial years, so they
  // can be read next to the I&E account and Balance Sheet (both Apr–Mar).
  // A 2026 budget becomes FY 2026-27 (Apr 2026 – Mar 2027).
  if (from < 7) {
    next.budgets = (next.budgets || []).map((b) => (b.fy ? b : { ...b, fy: fyFromYear(b.year) }))
  }


  // v7 → v8: the placeholder name "Kalyan Sewa Organisation" shipped inside the
  // default AI system prompt and the SEO description. Those live in persisted
  // state, so correcting the defaults alone would leave existing installs
  // introducing themselves by the wrong name. Rewrite it where the stale text
  // is still present — and only there, because the prompt is user-editable and
  // a blunt rewrite would clobber someone's own wording.
  if (from < 8) {
    const ORG = "Kuki Students' Organisation Chandigarh"
    const fix = (text) => text
      .replace(/KSO \(Kalyan Sewa Organisation\)/g, `${ORG} (KSO)`)
      .replace(/Kalyan Sewa Organisation/g, ORG)
    if (typeof next.ai?.systemPrompt === 'string' && next.ai.systemPrompt.includes('Kalyan Sewa')) {
      next.ai = { ...next.ai, systemPrompt: fix(next.ai.systemPrompt) }
    }
    const meta = next.content?.seo?.metaDescription
    if (typeof meta === 'string' && meta.includes('Kalyan Sewa')) {
      next.content = { ...next.content, seo: { ...next.content.seo, metaDescription: fix(meta) } }
    }
  }

  // v8 → v9: the "Who we are" image and gallery tile 8 pointed at an Unsplash photo
  // that now 404s, so the home page rendered its alt text inside a 584x440 box.
  // The URL lives in persisted content, so correcting the default alone would leave
  // every existing install (and the browser of anyone who has already visited) showing
  // the broken image. Rewrite it only where the dead URL is still present — an exact
  // match, so a photo the organisation has since chosen itself is never touched.
  if (from < 9) {
    const DEAD = 'photo-1593113566592-e2d3b1a1a2b0'
    const ABOUT_IMAGE = 'photo-1497486751825-1233686d5d80' // community photo
    const MARATHON_IMAGE = 'photo-1552674605-db6ffd4facb5' // event photo, already in use
    const has = (v) => typeof v === 'string' && v.includes(DEAD)
    const swap = (url, target) => String(url).replace(DEAD, target)

    if (has(next.content?.about?.image)) {
      next.content = {
        ...next.content,
        about: { ...next.content.about, image: swap(next.content.about.image, ABOUT_IMAGE) },
      }
    }
    if (Array.isArray(next.content?.gallery?.images)) {
      next.content = {
        ...next.content,
        gallery: {
          ...next.content.gallery,
          images: next.content.gallery.images.map((img) =>
            has(img?.src) ? { ...img, src: swap(img.src, MARATHON_IMAGE) } : img,
          ),
        },
      }
    }
  }

  return next
}

export const STORE_VERSION = 9

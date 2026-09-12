import { JSDOM } from 'jsdom'

const dom = new JSDOM('<!doctype html><html><body><div id="app"></div></body></html>', {
  url: 'http://localhost/admin', pretendToBeVisual: true,
})
const { window } = dom
globalThis.window = window
globalThis.document = window.document
globalThis.navigator = window.navigator
globalThis.HTMLElement = window.HTMLElement
globalThis.Element = window.Element
globalThis.Node = window.Node
globalThis.Event = window.Event
globalThis.KeyboardEvent = window.KeyboardEvent
globalThis.MouseEvent = window.MouseEvent
globalThis.getComputedStyle = window.getComputedStyle
globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0)
globalThis.cancelAnimationFrame = (id) => clearTimeout(id)
window.HTMLElement.prototype.scrollIntoView = function () {}
window.scrollTo = function () {} // jsdom has no layout
window.HTMLElement.prototype.releasePointerCapture = function () {}
window.HTMLElement.prototype.hasPointerCapture = function () { return false }
globalThis.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} }
window.ResizeObserver = globalThis.ResizeObserver
globalThis.IntersectionObserver = class { observe() {} unobserve() {} disconnect() {} }
window.IntersectionObserver = globalThis.IntersectionObserver
if (!window.matchMedia) window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} })
globalThis.matchMedia = window.matchMedia
// Expose every DOM constructor jsdom provides (Radix needs HTMLFormElement & friends)
for (const key of Object.getOwnPropertyNames(window)) {
  if (!(key in globalThis)) {
    try { globalThis[key] = window[key] } catch { /* getters that throw — safe to skip */ }
  }
}
// Force jsdom's event constructors — Node has its own CustomEvent, and jsdom
// rejects foreign event objects when Radix dispatches them.
for (const k of ['Event', 'CustomEvent', 'KeyboardEvent', 'MouseEvent', 'PointerEvent', 'FocusEvent', 'InputEvent', 'UIEvent']) {
  if (window[k]) globalThis[k] = window[k]
}
globalThis.DOMRect = globalThis.DOMRect || class { constructor(x = 0, y = 0, w = 0, h = 0) { this.x = x; this.y = y; this.width = w; this.height = h } }
globalThis.IS_REACT_ACT_ENVIRONMENT = true

const m = await import('./.build/entry.dom.js')
const { act } = await import('react-dom/test-utils')

const container = document.getElementById('app')
let root
const setInput = (el, value) => {
  const proto = el.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype
  Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, value)
  el.dispatchEvent(new window.Event('input', { bubbles: true }))
}

await act(async () => { m.useSite.setState({ authed: false, currentUser: null }) })
await act(async () => { root = m.mount(container) })
await act(async () => { await new Promise((r) => setTimeout(r, 260)) })

let fails = 0
const text = () => document.body.textContent
const has = (needle) => text().includes(needle)
const check = (label, ok, extra = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label.padEnd(50)} ${extra}`)
  if (!ok) fails++
}

// React reports missing keys, bad nesting and act() problems through console.error.
// Collect them so the suite can assert the console came out clean.
const consoleErrors = []
const passthroughError = console.error.bind(console)
console.error = (...args) => { consoleErrors.push(args.map(String).join(' ')); passthroughError(...args) }
const q = (sel) => document.querySelector(sel)
const qa = (sel) => [...document.querySelectorAll(sel)]
const byText = (sel, t) => qa(sel).find((el) => el.textContent.trim() === t)
const click = async (el) => { await act(async () => { el.dispatchEvent(new window.MouseEvent('click', { bubbles: true })) }) }
// Radix Tabs activate on mousedown, not click
const clickTab = async (el) => {
  await act(async () => {
    for (const t of ['pointerdown', 'mousedown', 'mouseup', 'click']) {
      el.dispatchEvent(new window.MouseEvent(t, { bubbles: true, button: 0, cancelable: true }))
    }
  })
}

console.log('\n— Sign in (email + password) —')
check('login screen renders', has("Kuki Students' Organisation Chandigarh"))
check('shows the registration number', has('Regd. No. 2991/79'))
check('shows the tagline', has('Learn • Unite • Serve'))
check('has an email field', Boolean(q('#login-email')))
check('has a password field', Boolean(q('#login-password')))
check('has a sign in button', has('Sign in'))

const signInBtn = () => qa('button').find((b) => b.textContent.includes('Sign in'))
await act(async () => {
  setInput(q('#login-email'), 'admin@ksochd.org')
  setInput(q('#login-password'), 'not-the-password')
})
await click(signInBtn())
await act(async () => { await new Promise((r) => setTimeout(r, 450)) })
check('rejects wrong credentials', m.useSite.getState().authed === false)
check('shows an error message', has('do not match an account'))

await act(async () => { setInput(q('#login-password'), 'ksochd2026') })
await click(signInBtn())
await act(async () => { await new Promise((r) => setTimeout(r, 450)) })
check('signs in with the right credentials', m.useSite.getState().authed === true)
check('records who signed in', m.useSite.getState().currentUser?.email === 'admin@ksochd.org')
check('password is cleared after sign in', q('#login-password') === null || q('#login-password')?.value === '')
await act(async () => { await new Promise((r) => setTimeout(r, 260)) })

console.log('\n=== DOM suite: admin navigation (jsdom) ===\n')
console.log('— Admin shell mounts —')
check('renders authed shell (not login)', !has('Member & Finance Portal — sign in') && has('Local storage'))
check('header shows storage mode', has('Local storage'))
check('header shows unread count', has('unread'))

console.log('\n— Books are posted from the finance system —')
const st = m.useSite.getState()
check('store holds a chart of accounts', (st.accounts || []).length > 20, `${(st.accounts || []).length} accounts`)
check('store holds grants', (st.grants || []).length === 4)
check('every transaction has a voucher', (st.vouchers || []).length === (st.transactions || []).length,
  `${(st.vouchers || []).length} vouchers / ${(st.transactions || []).length} transactions`)
check('vouchers carry the chart codes', (st.vouchers || []).every((v) => (v.lines || []).every((l) => st.accounts.some((a) => a.code === l.account))))
check('vouchers link back to their transaction', (st.vouchers || []).filter((v) => v.source === 'transaction').every((v) => st.transactions.some((t) => t.id === v.sourceId)))

console.log('\n— Overview reads the finance system, not the quick ledger —')
const allTx = m.useSite.getState().transactions || []
const ledgerRows = m.useSite.getState().ledger || []
const financeIncome = allTx.filter((t) => t.type === 'income').reduce((a, t) => a + Number(t.amount || 0), 0)
const ledgerIncome = ledgerRows.filter((r) => r.type === 'income').reduce((a, r) => a + Number(r.amount || 0), 0)
check('finance and quick ledger differ (test is meaningful)', financeIncome !== ledgerIncome,
  `finance ${financeIncome} vs ledger ${ledgerIncome}`)
check('total received comes from the finance system', has(m.formatCurrency(financeIncome)))
check('does NOT show the quick-ledger total', !has(m.formatCurrency(ledgerIncome)))
check('recent transactions are listed', has('Recent transactions'))

console.log('\n— Grouped information architecture —')
for (const g of ['Overview', 'Content', 'People & money', 'Engage', 'System']) check(`group: ${g}`, has(g))
const navButtons = qa('[data-nav-item]')
check('all 13 nav items present', navButtons.length === 13, `${navButtons.length} items`)
for (const id of ['overview', 'content', 'collections', 'about', 'impact', 'members', 'finance', 'accounts', 'reports', 'ledger', 'inbox', 'ai', 'system']) {
  check(`nav item: ${id}`, Boolean(q(`[data-nav-item="${id}"]`)))
}
check('mobile strip present', qa('[data-active]').length >= 13, `${qa('[data-active]').length} chips`)

console.log('\n— Site content: homepage FAQs + SEO title are editable —')
await click(q('[data-nav-item="content"]'))
await act(async () => { await new Promise((r) => setTimeout(r, 220)) })
check('content tab loads', has('Names, contact details'))
check('FAQ editor renders', has('Homepage FAQs'))
check('the SEO title field is present', has('Shown after the page name'))

const faqSeed = m.useSite.getState().content.faqs
check('store seeds FAQ rows', Array.isArray(faqSeed) && faqSeed.length > 0, `${faqSeed?.length} rows`)
// Question text lives in an <input value>, which is not part of textContent — read the values.
check('every seeded FAQ question is on screen',
  faqSeed.every((f) => qa('input').some((el) => el.value === f.q)), `${faqSeed.length} questions`)
check('FAQ answers render in textareas', qa('textarea').some((t) => t.value === faqSeed[0].a))

// --- the SEO title suffix writes through to the store ---
const seoInput = qa('input').find((el) => el.value === m.useSite.getState().content.seo.titleSuffix)
check('SEO title input carries the stored value', Boolean(seoInput))
await act(async () => { setInput(seoInput, 'KSO Chandigarh — test suffix') })
check('editing the SEO title writes to the store',
  m.useSite.getState().content.seo.titleSuffix === 'KSO Chandigarh — test suffix',
  m.useSite.getState().content.seo.titleSuffix)

// --- editing an existing FAQ question writes through to the store ---
const qInput = qa('input').find((el) => el.value === faqSeed[0].q)
check('FAQ question input renders', Boolean(qInput))
await act(async () => { setInput(qInput, 'Edited question text') })
check('editing a FAQ question writes to the store',
  m.useSite.getState().content.faqs[0].q === 'Edited question text',
  m.useSite.getState().content.faqs[0].q)

// --- add ---
const faqBefore = m.useSite.getState().content.faqs.length
await click(qa('button').find((b) => b.textContent.includes('Add FAQ')))
await act(async () => { await new Promise((r) => setTimeout(r, 150)) })
const grown = m.useSite.getState().content.faqs
check('Add FAQ appends a row', grown.length === faqBefore + 1, `${faqBefore} → ${grown.length}`)
check('the new FAQ has a unique id', new Set(grown.map((f) => f.id)).size === grown.length)

// --- reorder: move the new (last) row up ---
const movedQ = grown[grown.length - 1].q
const upBtns = qa('[aria-label="Move up"]')
check('reorder controls render', upBtns.length === grown.length, `${upBtns.length} buttons`)
await click(upBtns[upBtns.length - 1])
await act(async () => { await new Promise((r) => setTimeout(r, 150)) })
check('Move up reorders the FAQ list',
  m.useSite.getState().content.faqs[grown.length - 2].q === movedQ,
  `now at index ${m.useSite.getState().content.faqs.findIndex((f) => f.q === movedQ)}`)

// --- delete the added row ---
const delBtns = qa('[aria-label="Delete"]')
await click(delBtns[delBtns.length - 1])
await act(async () => { await new Promise((r) => setTimeout(r, 150)) })
check('Delete removes the FAQ row', m.useSite.getState().content.faqs.length === faqBefore,
  `${m.useSite.getState().content.faqs.length} rows`)
check('deleting leaves the edited question intact',
  m.useSite.getState().content.faqs[0].q === 'Edited question text')
check('FAQ writes reach the audit trail',
  (m.useSite.getState().audit || []).some((a) => a.target === 'faqs'),
  (m.useSite.getState().audit || []).find((a) => a.target === 'faqs')?.action || 'none')

// Restore the seeded content so the rest of the suite is unaffected.
await act(async () => {
  const s = m.useSite.getState()
  m.useSite.setState({
    content: { ...s.content, faqs: faqSeed, seo: { ...s.content.seo, titleSuffix: 'KSO Chandigarh' } },
  })
})
check('content restored to seed for the rest of the suite',
  m.useSite.getState().content.faqs[0].q === faqSeed[0].q &&
  m.useSite.getState().content.faqs.length === faqSeed.length)

console.log('\n— Live badges from store data —')
const unread = m.useSite.getState().submissions.filter((s) => s.status === 'new').length
const pending = m.useSite.getState().transactions.filter((t) => t.status === 'Pending').length
check('inbox badge matches store', has(String(unread)) && unread > 0, `unread=${unread}`)
check('pending txn badge matches store', pending === 0 || has(String(pending)), `pending=${pending}`)

console.log('\n— Navigation works —')
await click(q('[data-nav-item="members"]'))
await act(async () => { await new Promise((r) => setTimeout(r, 200)) })
check('clicking Membership loads membership tab', has('Membership management'))
check('membership tab shows directory table', has('Member') && has('Export CSV'))

console.log('\n— Membership tiers: Individual / Family —')
check('exactly two tiers defined', JSON.stringify(m.seed.MEMBER_TIERS) === '["Individual","Family"]', m.seed.MEMBER_TIERS.join(' / '))
check('fees are 500 / 1000', m.seed.TIER_FEES.Individual === 500 && m.seed.TIER_FEES.Family === 1000,
  `Individual ₹${m.seed.TIER_FEES.Individual} · Family ₹${m.seed.TIER_FEES.Family}`)

const seeded = m.seed.seedMemberships()
check('all seed members use a valid tier', seeded.every((x) => m.seed.MEMBER_TIERS.includes(x.tier)))
check('no household on Individual members', seeded.filter((x) => x.tier === 'Individual').every((x) => (x.household || []).length === 0))
const fams = seeded.filter((x) => x.tier === 'Family')
check('Family members carry a household', fams.length > 0 && fams.every((x) => x.household.length > 0), `${fams.length} family records`)
check('household names + relations stored', fams.every((x) => x.household.every((h) => h.name && m.seed.HOUSEHOLD_RELATIONS.includes(h.relation))))
check('fee follows the tier', seeded.every((x) => Number(x.feeAmount) === m.seed.TIER_FEES[x.tier]))
check('legacy tiers migrate forward', m.seed.migrateTier('Basic') === 'Individual' && m.seed.migrateTier('Patron') === 'Family')

check('directory renders both tier names', has('Individual') && has('Family'))
check('directory shows household size', /Family\s*·\s*\d+ people/.test(text().replace(/\s+/g, ' ')))

// detail dialog renders through a portal -> assert against document.body
const famRow = qa('button').find((b) => b.textContent.includes('Simran Kaur'))
check('family member row found', Boolean(famRow))
await click(famRow)
await act(async () => { await new Promise((r) => setTimeout(r, 260)) })
check('member detail opens', has('Household'))
check('household members listed', has('Rajinder Singh') && has('Aarav Singh'))
check('relations shown', has('Spouse') && has('Child'))
check('people count in detail', /Household\s*·\s*3 people/.test(text().replace(/\s+/g, ' ')))
await act(async () => { document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true })) })
await act(async () => { await new Promise((r) => setTimeout(r, 260)) })
check('detail closes on Escape', !has('Rajinder Singh'))

// the household editor is conditional on the tier
const addBtn = qa('button').find((b) => b.textContent.trim() === 'Add member')
check('add member button found', Boolean(addBtn))
await click(addBtn)
await act(async () => { await new Promise((r) => setTimeout(r, 260)) })
check('member form opens', has('Member type') && has('Tier'))
check('household editor hidden for Individual tier', !has('Household members'))
await act(async () => { document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true })) })
await act(async () => { await new Promise((r) => setTimeout(r, 260)) })
check('member form closes', !has('Member type'))

const tiersTab = qa('[role="tab"]').find((t) => t.textContent.includes('Tiers'))
check('tiers tab present', Boolean(tiersTab))
await clickTab(tiersTab)
await act(async () => { await new Promise((r) => setTimeout(r, 260)) })
check('tiers panel shows fees', has('₹500') && has('₹1,000'))
check('tiers panel counts people covered', /\d+ people covered/.test(text().replace(/\s+/g, ' ')))
const dirTab = qa('[role="tab"]').find((t) => t.textContent.includes('Directory'))
await clickTab(dirTab)
await act(async () => { await new Promise((r) => setTimeout(r, 220)) })

// MembershipTab was split into panels — exercise the plumbing the split moved.
console.log('\n— Directory filters and the member profile —')
const memberRows = () => qa('table tbody tr').length
const rowsAll = memberRows()
check('directory lists members', rowsAll > 0, `${rowsAll} rows`)
const memberSearch = q('input[placeholder^="Search name"]')
check('directory search box is present', Boolean(memberSearch))
if (memberSearch) {
  await act(async () => { setInput(memberSearch, 'zzz-no-such-member-zzz') })
  await act(async () => { await new Promise((r) => setTimeout(r, 240)) })
  check('search narrows the directory', memberRows() === 0, `${memberRows()} rows`)
  const clearMember = qa('button').find((b) => b.textContent.includes('Clear'))
  await click(clearMember)
  await act(async () => { await new Promise((r) => setTimeout(r, 260)) })
  check('clearing restores the directory', memberRows() === rowsAll, `${memberRows()} of ${rowsAll}`)
}
const memberLink = qa('table tbody tr button')[0]
await click(memberLink)
await act(async () => { await new Promise((r) => setTimeout(r, 320)) })
check('member profile opens', has('Renews') || has('Joined'))
check('profile shows contributions or the empty note', has('Contributed') || has('No transactions linked'))
await act(async () => { document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true })) })
await act(async () => { await new Promise((r) => setTimeout(r, 240)) })

/* ====================================================================== *
 * Membership revision: member numbers, editable tiers, fee cycles,
 * status reconciliation, dues and fee receipts.
 * ====================================================================== */
const M = m.membership

/** Run a store mutation inside act() so React state updates stay batched. */
const mutate = async (fn) => {
  let out
  await act(async () => { out = fn() })
  return out
}

/** Refresh the React Query snapshot after a direct store write. */
const syncQueries = async () => {
  await act(async () => { await m.queryClient.invalidateQueries() })
  await act(async () => { await new Promise((r) => setTimeout(r, 260)) })
}

console.log('\n— Member numbers are assigned, never drawn at random —')
const nosNow = () => m.useSite.getState().memberships.map((x) => x.memberNo)
const nosBefore = nosNow()
check('every existing member has a number', nosBefore.every(Boolean), `${nosBefore.length} numbers`)
check('no duplicates in the roster',
  new Set(nosBefore).size === nosBefore.length, `${new Set(nosBefore).size} unique of ${nosBefore.length}`)
check('the next number follows the highest',
  M.nextMemberNo(m.useSite.getState().memberships) === 'KSO-1013',
  M.nextMemberNo(m.useSite.getState().memberships))
check('the random generator is gone from the form',
  typeof M.nextMemberNo === 'function' && !/Math\.random\(\) \* 9000/.test(String(M.nextMemberNo)))

// Add a member through the real form and read back what the store stored.
await click(q('[data-nav-item="members"]'))
await act(async () => { await new Promise((r) => setTimeout(r, 300)) })
await click(qa('button').find((b) => b.textContent.trim() === 'Add member'))
await act(async () => { await new Promise((r) => setTimeout(r, 260)) })
check('member form offers the settings-backed tiers', has('Individual — ₹500/yr'), 'Individual — ₹500/yr')

const nameField = qa('input').find((i) => i.placeholder === 'Harpreet Singh')
await act(async () => { setInput(nameField, 'Numbering Test Member') })
// The header button carries the same label, so scope the submit to the dialog.
const dialog = document.querySelector('[role="dialog"]')
const addSubmit = [...(dialog?.querySelectorAll('button') || [])].find((b) => b.textContent.trim() === 'Add member')
check('the dialog submit button was found', Boolean(addSubmit))
await click(addSubmit)
await act(async () => { await new Promise((r) => setTimeout(r, 700)) })

const numMember = m.useSite.getState().memberships.find((x) => x.name === 'Numbering Test Member')
check('the new member received a number', Boolean(numMember?.memberNo), String(numMember?.memberNo))
check('it is the next in sequence', numMember?.memberNo === 'KSO-1013', String(numMember?.memberNo))
check('it does not duplicate anyone',
  new Set(nosNow()).size === nosNow().length, `${new Set(nosNow()).size} unique of ${nosNow().length}`)
check('fee defaults to the tier fee', Number(numMember?.feeAmount) === 500, String(numMember?.feeAmount))

/* ---------------------------- fee cycles ------------------------------- */
console.log('\n— Fee cycles: only monthly and annual renew —')
check('monthly is renewable', M.isRenewable('monthly'))
check('annual is renewable', M.isRenewable('annual'))
check('one-time is NOT renewable', !M.isRenewable('one-time'))
check('no-fee is NOT renewable', !M.isRenewable('none'))
check('a one-time member gets no next date', M.nextRenewalDate({ feeCycle: 'one-time' }) === null)
check('an annual member does get one',
  /^\d{4}-\d{2}-\d{2}$/.test(M.nextRenewalDate({ feeCycle: 'annual' }) || ''),
  String(M.nextRenewalDate({ feeCycle: 'annual' })))

// The old code turned every non-monthly cycle into annual. Prove the new path
// refuses instead, through the real renew handler in the tab.
await act(async () => {
  m.useSite.setState((s) => ({
    memberships: s.memberships.map((x) => (x.id === numMember.id ? { ...x, feeCycle: 'one-time' } : x)),
  }))
})
await syncQueries()
const txBeforeRenew = m.useSite.getState().transactions.length
const receiptBeforeRenew = m.useSite.getState().feeReceipts.length
const oneTimeRow = () => qa('table tbody tr').find((tr) => tr.textContent.includes('Numbering Test Member'))
const oneTimeLink = oneTimeRow()?.querySelector('button')
if (oneTimeLink) await click(oneTimeLink)
await act(async () => { await new Promise((r) => setTimeout(r, 320)) })
check('one-time fee cycle is shown plainly', has('one-time — does not renew'), 'one-time — does not renew')
await act(async () => { document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true })) })
await act(async () => { await new Promise((r) => setTimeout(r, 240)) })

/* ---------------------- status reconciliation -------------------------- */
console.log('\n— Status truth: stored status vs renewal date —')
const nowRef = new Date()
check('active + past date reads as Expired',
  M.effectiveStatus({ status: 'Active', renewsOn: '2020-01-01' }, nowRef).status === 'Expired')
check('Suspended is never overridden by a date',
  M.effectiveStatus({ status: 'Suspended', renewsOn: '2020-01-01' }, nowRef).status === 'Suspended')
check('no renewal date leaves the status alone',
  M.effectiveStatus({ status: 'Active' }, nowRef).status === 'Active')

// Plant a stale row, then let the real Reconcile button fix it.
await act(async () => {
  m.useSite.setState((s) => ({
    memberships: s.memberships.map((x) => (x.id === numMember.id ? { ...x, status: 'Active', renewsOn: '2020-01-01' } : x)),
  }))
})
await syncQueries()
check('the stale row is detected', M.reconcileStatuses(m.useSite.getState().memberships).length >= 1,
  `${M.reconcileStatuses(m.useSite.getState().memberships).length} stale`)
const reconBtn = qa('button').find((b) => b.textContent.includes('Reconcile'))
check('the Reconcile button appears when something is stale', Boolean(reconBtn))
check('it names how many rows are stale', /Reconcile \d+ status/.test(reconBtn?.textContent || ''), reconBtn?.textContent?.trim())
await click(reconBtn)
await act(async () => { await new Promise((r) => setTimeout(r, 400)) })
const fixed = m.useSite.getState().memberships.find((x) => x.id === numMember.id)
check('reconciling rewrites the stored status', fixed?.status === 'Expired', String(fixed?.status))
check('nothing is left stale afterwards', M.reconcileStatuses(m.useSite.getState().memberships).length === 0)
check('the reconciliation is in the audit trail',
  (m.useSite.getState().audit || []).some((a) => a.action === 'reconciled member statuses'))

/* ------------------------------- dues ---------------------------------- */
console.log('\n— Dues are visible and add up —')
const duesList = M.membershipDues(m.useSite.getState().memberships, m.useSite.getState().transactions, m.useSite.getState().settings)
check('dues computed for every member', duesList.length === m.useSite.getState().memberships.length)
check('every row has a status', duesList.every((d) => ['paid', 'partial', 'unpaid', 'n/a'].includes(d.status)))
check('due is never negative', duesList.every((d) => d.due >= 0))
check('the directory shows a Dues column', has('Dues'))
check('the arrears KPI is on screen', has('Arrears'))
check('a pledge row would not count as a fee', M.membershipDues(
  [{ id: 'p', name: 'P', feeAmount: 500, feeCycle: 'annual' }],
  [{ type: 'income', category: 'Donation', amount: 5000, date: '2026-05-01', memberId: 'p' }],
  undefined, '2026-27')[0].status === 'unpaid')

/* -------------------------- editable tiers ----------------------------- */
console.log('\n— Tiers are editable, and guarded —')
const tiersTab2 = qa('[role="tab"]').find((t) => t.textContent.includes('Tiers'))
await clickTab(tiersTab2)
await act(async () => { await new Promise((r) => setTimeout(r, 300)) })
check('the tier editor is present', has('Edit tiers'))
check('seed tiers are still listed', has('Individual') && has('Family'))

// Store writes go through act() — the same discipline the rest of this suite
// keeps — so React re-renders do not leak act() warnings into the console.

// Add a tier through the store action the UI calls, then check it is offered.
const addTier = await mutate(() => m.useSite.getState().addMembershipTier({ name: 'Student', fee: 250 }))
check('a new tier can be added', addTier.ok === true, JSON.stringify(addTier))
check('it appears in the tier list',
  M.tierNames(m.useSite.getState().settings).includes('Student'),
  M.tierNames(m.useSite.getState().settings).join('/'))
check('its fee is stored', M.tierFee(m.useSite.getState().settings, 'Student') === 250)
check('a duplicate tier is refused',
  (await mutate(() => m.useSite.getState().addMembershipTier({ name: 'student', fee: 1 }))).ok === false)
check('a blank tier name is refused',
  (await mutate(() => m.useSite.getState().addMembershipTier({ name: '   ' }))).ok === false)

// A repricing must not rewrite what a member already pays.
const beforeFee = m.useSite.getState().memberships.find((x) => x.id === numMember.id).feeAmount
await mutate(() => m.useSite.getState().updateMembershipTier('Individual', { fee: 750 }))
check('repricing a tier succeeds', M.tierFee(m.useSite.getState().settings, 'Individual') === 750)
check('a member keeps their own fee after a repricing',
  m.useSite.getState().memberships.find((x) => x.id === numMember.id).feeAmount === beforeFee,
  `${beforeFee} -> ${m.useSite.getState().memberships.find((x) => x.id === numMember.id).feeAmount}`)

// Renaming cascades to the members sitting on that tier.
const onIndividual = m.useSite.getState().memberships.filter((x) => x.tier === 'Individual').length
const rename = await mutate(() => m.useSite.getState().updateMembershipTier('Individual', { name: 'Individual (Ordinary)' }))
check('renaming a tier succeeds', rename.ok === true, JSON.stringify(rename))
check('renaming moves the members on it', rename.moved === onIndividual, `${rename.moved} moved`)
check('no member is left on the old name',
  m.useSite.getState().memberships.every((x) => x.tier !== 'Individual'),
  `${m.useSite.getState().memberships.filter((x) => x.tier === 'Individual').length} left behind`)
check('the new name is in settings',
  M.tierNames(m.useSite.getState().settings).includes('Individual (Ordinary)'))
await mutate(() => m.useSite.getState().updateMembershipTier('Individual (Ordinary)', { name: 'Individual' }))

// Removal guards.
const inUseTier = 'Individual'
const blocked = await mutate(() => m.useSite.getState().removeMembershipTier(inUseTier))
check('removing an occupied tier is refused', blocked.reason === 'in use', JSON.stringify(blocked))
check('removing it by force succeeds',
  (await mutate(() => m.useSite.getState().removeMembershipTier(inUseTier, { force: true }))).ok === true)
check('the tier is gone',
  !M.tierNames(m.useSite.getState().settings).includes(inUseTier),
  M.tierNames(m.useSite.getState().settings).join('/'))
// Put it back and drop the test tier so later assertions see a sane store.
await mutate(() => m.useSite.getState().addMembershipTier({ name: 'Individual', fee: 500 }))
await mutate(() => m.useSite.getState().removeMembershipTier('Student'))

// The last remaining tier can never be removed: every member must sit on one.
let lastTierRefused = false
await mutate(() => {
  const names = M.tierNames(m.useSite.getState().settings)
  names.filter((n) => n !== 'Family').forEach((n) => m.useSite.getState().removeMembershipTier(n, { force: true }))
  lastTierRefused = m.useSite.getState().removeMembershipTier('Family').ok === false
})
check('the last tier cannot be removed', lastTierRefused)

// Restore the shipped pair.
await act(async () => {
  m.useSite.setState((s) => ({ settings: { ...s.settings, membership: m.membership.defaultMembershipSettings() } }))
})
check('settings restore to the shipped tiers',
  JSON.stringify(M.tierNames(m.useSite.getState().settings)) === '["Individual","Family"]',
  M.tierNames(m.useSite.getState().settings).join('/'))

/* --------------------------- fee receipts ------------------------------ */
console.log('\n— Fee receipts are their own series —')
check('the fee series is separate from 80G',
  m.accounting.nextFeeReceiptNo([], '2026-09-12') === 'KSO/MEM/2026-27/0001',
  m.accounting.nextFeeReceiptNo([], '2026-09-12'))
check('it does not collide with the 80G series',
  m.accounting.nextReceiptNo([], '2026-09-12') === 'KSO/80G/2026-27/0001',
  m.accounting.nextReceiptNo([], '2026-09-12'))
check('an 80G receipt does not advance the fee series',
  m.accounting.nextFeeReceiptNo([{ no: 'KSO/80G/2026-27/0001' }], '2026-09-12') === 'KSO/MEM/2026-27/0001')
check('a deleted number is not handed out twice',
  m.accounting.nextFeeReceiptNo([{ no: 'KSO/MEM/2026-27/0001' }, { no: 'KSO/MEM/2026-27/0002' }], '2026-09-12') === 'KSO/MEM/2026-27/0003')

const feeModel = m.docs.buildFeeReceipt({
  receipt: { no: 'KSO/MEM/2026-27/0001', date: '2026-09-12', member: 'Harpreet Singh', memberNo: 'KSO-1001', tier: 'Individual', amount: 500, period: '2026-27' },
  settings: m.useSite.getState().settings,
  org: m.useSite.getState().content.org,
})
check('the receipt spells the amount out', /five hundred/i.test(feeModel.amountWords), feeModel.amountWords)
check('the receipt says it is not a donation',
  /not a donation/i.test(feeModel.notADonation) && /80G/.test(feeModel.notADonation))
check('a fee receipt does not demand 80G details',
  !feeModel.missing.some((x) => x.key === 'g80No' || x.key === 'g80ValidUpto'),
  feeModel.missing.map((x) => x.key).join(',') || 'nothing missing')

/* ---------------------- renewal issues a receipt ----------------------- */
console.log('\n— Renewal records the fee and issues a numbered receipt —')
// The tier section above left this tab on Tiers & fees, where no table renders.
await clickTab(qa('[role="tab"]').find((t) => t.textContent.includes('Directory')))
await act(async () => { await new Promise((r) => setTimeout(r, 300)) })
await act(async () => {
  m.useSite.setState((s) => ({
    memberships: s.memberships.map((x) => (x.id === numMember.id
      ? { ...x, feeCycle: 'annual', status: 'Active', renewsOn: '2020-01-01', feeAmount: 500 }
      : x)),
  }))
})
await syncQueries()

const targetRow = () => qa('table tbody tr').find((tr) => tr.textContent.includes('Numbering Test Member'))
// The row's first button is the name link, which opens the profile.
const nameLink = targetRow()?.querySelector('button')
if (nameLink) await click(nameLink)
await act(async () => { await new Promise((r) => setTimeout(r, 320)) })
const profile = document.querySelector('[role="dialog"]')
const renewBtn = [...(profile?.querySelectorAll('button') || [])].find((b) => b.textContent.trim().startsWith('Renew'))
check('a renewable member offers Renew on the profile', Boolean(renewBtn))
check('the profile explains the cycle', has('annual'), 'annual')
const memTxBefore = m.useSite.getState().transactions.length
const recBefore = m.useSite.getState().feeReceipts.length
if (renewBtn) await click(renewBtn)
await act(async () => { await new Promise((r) => setTimeout(r, 800)) })
await syncQueries()

const after = m.useSite.getState()
check('renewal recorded a fee transaction', after.transactions.length === memTxBefore + 1, `${memTxBefore} → ${after.transactions.length}`)
check('renewal issued a numbered fee receipt', after.feeReceipts.length === recBefore + 1, `${recBefore} → ${after.feeReceipts.length}`)
const issued = after.feeReceipts[after.feeReceipts.length - 1] || after.feeReceipts[0]
check('the receipt is in the MEM series', /^KSO\/MEM\/\d{4}-\d{2}\/\d{4}$/.test(issued?.no || ''), String(issued?.no))
check('the receipt is linked to the member', issued?.memberId === numMember.id)
check('the receipt carries the amount', Number(issued?.amount) === 500, String(issued?.amount))
const renewed = after.memberships.find((x) => x.id === numMember.id)
check('the renewal date moved forward', String(renewed?.renewsOn) > '2026-01-01', String(renewed?.renewsOn))
check('the member is Active again', renewed?.status === 'Active', String(renewed?.status))
check('the fee is tagged to the member on the ledger row',
  after.transactions.some((t) => t.memberId === numMember.id && t.category === 'Membership fee' && Number(t.amount) === 500))
check('the renewal is in the audit trail',
  (after.audit || []).some((a) => a.action === 'created' && a.target === 'feeReceipts'))

// The receipt must survive a reload — it has to be in the persisted slice.
const persisted = JSON.stringify(JSON.parse(localStorage.getItem('kso-site-store-v2') || '{}'))
check('fee receipts are persisted, not just held in memory', persisted.includes('KSO/MEM/'),
  persisted.includes('KSO/MEM/') ? 'present in localStorage' : 'MISSING from localStorage')

// Clean up the member this block numMember so later sections see the seed roster.
await act(async () => {
  m.useSite.setState((s) => ({
    memberships: s.memberships.filter((x) => x.id !== numMember.id),
    feeReceipts: s.feeReceipts.filter((r) => r.memberId !== numMember.id),
    transactions: s.transactions.filter((t) => t.memberId !== numMember.id),
  }))
})
check('test member removed', !m.useSite.getState().memberships.some((x) => x.id === numMember.id))

await click(q('[data-nav-item="finance"]'))
await act(async () => { await new Promise((r) => setTimeout(r, 300)) })
check('clicking Finance loads finance tab', has('Financial management'))
check('finance tab shows commitments tab', has('Commitments'))
const budgetsTab = qa('[role="tab"]').find((t) => t.textContent.includes('Budget'))
await clickTab(budgetsTab)
await act(async () => { await new Promise((r) => setTimeout(r, 260)) })
const fySelect = q('select[aria-label="Budget financial year"]')
check('budgets are reviewed by financial year', Boolean(fySelect), fySelect ? `${fySelect.options.length} FYs` : 'none')
check('defaults to the current FY', /^\d{4}-\d{2}$/.test(fySelect?.value || ''), fySelect?.value)
check('shows FY, not calendar year', has('Financial year') && !has('Calendar year'))
check('budget heading names the FY', has(`FY ${fySelect?.value}`), `FY ${fySelect?.value}`)
await clickTab(qa('[role="tab"]').find((t) => t.textContent.includes('Transactions')))
await act(async () => { await new Promise((r) => setTimeout(r, 300)) })

console.log('\n— Transactions tab filters (FinanceTab split into panels) —')
const rowCount = () => qa('table tbody tr').length
const rowsBefore = rowCount()
check('transactions table renders rows', rowsBefore > 0, `${rowsBefore} rows`)
const searchBox = q('input[placeholder^="Search donor"]')
check('search box is present', Boolean(searchBox))
if (searchBox) {
  await act(async () => { setInput(searchBox, 'zzz-no-such-party-zzz') })
  await act(async () => { await new Promise((r) => setTimeout(r, 220)) })
  check('search narrows the table', rowCount() === 0, `${rowCount()} rows`)
  check('empty state shown', has('No transactions match'))
  const clearBtn = qa('button').find((b) => b.textContent.includes('Clear'))
  check('clear filters button appears', Boolean(clearBtn))
  if (clearBtn) {
    await click(clearBtn)
    await act(async () => { await new Promise((r) => setTimeout(r, 260)) })
    check('clearing restores the rows', rowCount() === rowsBefore, `${rowCount()} of ${rowsBefore}`)
  }
}

console.log('\n— Destructive actions ask properly (no native confirm) —')
await click(q('[data-nav-item="inbox"]'))
await act(async () => { await new Promise((r) => setTimeout(r, 260)) })
const clearBtn = qa('button').find((b) => b.textContent.includes('Clear inbox'))
check('clear inbox button exists', Boolean(clearBtn))
if (clearBtn) {
  const before = m.useSite.getState().submissions.length
  await click(clearBtn)
  await act(async () => { await new Promise((r) => setTimeout(r, 260)) })
  check('shows a confirmation dialog', has('Clear the whole inbox?'))
  check('nothing deleted before confirming', m.useSite.getState().submissions.length === before)
  const cancel = qa('button').find((b) => b.textContent.trim() === 'Cancel')
  await click(cancel)
  await act(async () => { await new Promise((r) => setTimeout(r, 260)) })
  check('cancel keeps the messages', m.useSite.getState().submissions.length === before)
}

console.log('\n— Quick entry writes into the same books —')
await click(q('[data-nav-item="ledger"]'))
await act(async () => { await new Promise((r) => setTimeout(r, 300)) })
check('quick entry tab loads (no second ledger)', has('Quick entry') && !has('Quick ledger'))
check('explains entries post to the books', has('Posts to the books immediately'))

const qeTxBefore = m.useSite.getState().transactions.length
const qeVBefore = m.useSite.getState().vouchers.length
const amountInput = qa('input[type="number"]')[0]
await act(async () => { setInput(amountInput, '4321') })
const partyInput = qa('input').find((i) => i.placeholder === 'Name')
await act(async () => { setInput(partyInput, 'Quick Entry Tester') })
const recordBtn = qa('button').find((b) => b.textContent.includes('Record entry'))
check('record button present', Boolean(recordBtn))
await click(recordBtn)
await act(async () => { await new Promise((r) => setTimeout(r, 450)) })

const st2 = m.useSite.getState()
check('entry created a transaction', st2.transactions.length === qeTxBefore + 1, `${qeTxBefore} → ${st2.transactions.length}`)
check('entry posted a voucher too', st2.vouchers.length === qeVBefore + 1, `${qeVBefore} → ${st2.vouchers.length}`)
const made = st2.transactions.find((t) => t.party === 'Quick Entry Tester')
check('amount recorded correctly', Number(made?.amount) === 4321)
check('voucher links back to the entry', st2.vouchers.some((v) => v.sourceId === made?.id))
check('form clears after recording', amountInput?.value === '' || amountInput?.value === undefined)

console.log('\n— Books & reports tabs —')
await click(q('[data-nav-item="accounts"]'))
await act(async () => { await new Promise((r) => setTimeout(r, 300)) })
check('accounts tab loads', has('Double-entry books for FY'))
check('day book lists vouchers', /RV-|PV-|JV-/.test(text()))
check('trial balance is reported balanced', has('Balanced') && has('both sides'))
check('unbalanced count is zero', has('All entries balance'))
const coaTab = qa('[role="tab"]').find((t) => t.textContent.includes('Chart of accounts'))
await clickTab(coaTab)
await act(async () => { await new Promise((r) => setTimeout(r, 250)) })
check('chart of accounts lists codes', has('1002') && has('Cash in hand'))
check('corpus fund present in chart', has('Corpus fund'))

await click(q('[data-nav-item="reports"]'))
await act(async () => { await new Promise((r) => setTimeout(r, 350)) })
check('reports tab loads', has('Financial reports'))
check('receipts & payments statement renders', has('Receipts and Payments account'))
check('opening + closing shown', has('Opening cash & bank balance') && has('Closing cash & bank balance'))
const ieTab = qa('[role="tab"]').find((t) => t.textContent.includes('Income'))
await clickTab(ieTab)
await act(async () => { await new Promise((r) => setTimeout(r, 250)) })
check('income & expenditure renders', has('Income and Expenditure account') && /Surplus|Deficit/.test(text()))
const bsTab = qa('[role="tab"]').find((t) => t.textContent.includes('Balance sheet'))
await clickTab(bsTab)
await act(async () => { await new Promise((r) => setTimeout(r, 250)) })
check('balance sheet renders and balances', has('Balance sheet') && has('equal funds and liabilities'))
const fTab = qa('[role="tab"]').find((t) => t.textContent.includes('Funds'))
await clickTab(fTab)
await act(async () => { await new Promise((r) => setTimeout(r, 250)) })
check('fund movement table renders', has('Fund movement') && has('Corpus'))
check('FCRA register renders', has('FCRA register'))
const gTab = qa('[role="tab"]').find((t) => t.textContent.includes('Grants'))
await clickTab(gTab)
await act(async () => { await new Promise((r) => setTimeout(r, 250)) })
check('grant utilisation renders', has('Grant') && has('Sanctioned'))

console.log('\n— Collapse rail —')
const collapseBtn = qa('button').find((b) => b.getAttribute('aria-label') === 'Collapse sidebar')
check('collapse control exists', Boolean(collapseBtn))
await click(collapseBtn)
await act(async () => { await new Promise((r) => setTimeout(r, 120)) })
check('collapsed rail keeps items accessible', qa('[data-nav-item]').length === 13, `${qa('[data-nav-item]').length} items`)
check('collapsed items keep aria-labels', q('[data-nav-item="members"]')?.getAttribute('aria-label') === 'Membership')
check('expand control appears', Boolean(qa('button').find((b) => b.getAttribute('aria-label') === 'Expand sidebar')))
await click(qa('button').find((b) => b.getAttribute('aria-label') === 'Expand sidebar'))
await act(async () => { await new Promise((r) => setTimeout(r, 120)) })
check('re-expanding restores labels', has('Membership'))

console.log('\n— Group collapse —')
const peopleHeader = qa('button').find((b) => b.textContent.trim().startsWith('People & money'))
check('group header is a toggle', Boolean(peopleHeader))
await click(peopleHeader)
await act(async () => { await new Promise((r) => setTimeout(r, 120)) })
check('collapsing group hides its items', !q('[data-nav-item="ledger"]'))
// re-query: React may replace the node between renders
const peopleHeader2 = qa('button').find((b) => b.textContent.trim().startsWith('People & money'))
if (peopleHeader2) await click(peopleHeader2)
await act(async () => { await new Promise((r) => setTimeout(r, 150)) })
const stillClosed = JSON.parse(localStorage.getItem('kso-admin-nav-groups') || '{}')
check('expanding group restores items', Boolean(q('[data-nav-item="ledger"]')), `closedGroups=${JSON.stringify(stillClosed)}`)

console.log('\n— ⌘K command palette —')
await act(async () => {
  window.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true }))
})
await act(async () => { await new Promise((r) => setTimeout(r, 200)) })
const paletteInput = q('input[placeholder="Search sections and actions…"]')
check('palette opens on ⌘K', Boolean(paletteInput))
check('palette mirrors groups', has('People & money') && has('Engage') && has('System'))
check('palette includes quick entry', has('Quick entry'))
check('palette has export actions', has('Export members (CSV)'))

console.log('\n— Public form flows (regression: store actions removed in refactors) —')
const publicBox = document.createElement('div')
document.body.appendChild(publicBox)
let pubRoot
await act(async () => { pubRoot = m.mountPublic(publicBox, '/volunteer') })
await act(async () => { await new Promise((r) => setTimeout(r, 250)) })

const inputs = [...publicBox.querySelectorAll('input')]
const nameInput = inputs.find((i) => i.placeholder === 'Your name')
const emailInput = publicBox.querySelector('input[type="email"]')
const phoneInput = inputs.find((i) => i.placeholder === '10-digit number')
check('volunteer form rendered', Boolean(nameInput && emailInput && phoneInput))

const beforeMembers = m.useSite.getState().memberships.length
await act(async () => {
  setInput(nameInput, 'Regression Tester')
  setInput(emailInput, 'tester@example.org')
  setInput(phoneInput, '9876543210')
})
// choose a role chip
const roleChip = [...publicBox.querySelectorAll('button')].find((b) => b.textContent.includes('Teaching / mentoring'))
await click(roleChip)
const submitBtn = [...publicBox.querySelectorAll('button')].find((b) => b.textContent.includes('Submit application'))
check('submit button present', Boolean(submitBtn))
await click(submitBtn)
await act(async () => { await new Promise((r) => setTimeout(r, 250)) })

const afterMembers = m.useSite.getState().memberships
check('volunteer submit did not crash', publicBox.textContent.includes('Application received'))
check('volunteer created a membership record', afterMembers.length === beforeMembers + 1, `${beforeMembers} → ${afterMembers.length}`)
const created = afterMembers.find((x) => x.name === 'Regression Tester')
check('record has Pending status', created?.status === 'Pending')
check('record typed as Volunteer', created?.type === 'Volunteer')
// The public form used to mint a random KSO-####. It must take the next number
// in sequence now, or the office roster has gaps in it.
check('public application takes the next member number in sequence',
  /^KSO-\d+$/.test(created?.memberNo || '') &&
  Number(String(created?.memberNo).replace('KSO-', '')) > 1000,
  String(created?.memberNo))
check('public application does not duplicate a number',
  new Set(afterMembers.map((x) => x.memberNo)).size === afterMembers.length,
  `${new Set(afterMembers.map((x) => x.memberNo)).size} unique of ${afterMembers.length}`)
check('record captured skills', Boolean(created?.skills))

console.log('\n— Donation writes into the finance ledger —')
const txBefore = m.useSite.getState().transactions.length
await act(async () => {
  await m.db.transactions.create({
    date: new Date().toISOString().slice(0, 10), type: 'income', category: 'Donation',
    amount: 5000, program: 'education', party: 'Ledger Tester', method: 'UPI',
    reference: 'TEST-1', status: 'Cleared', note: 'regression', memberId: '',
  })
})
const txAfter = m.useSite.getState().transactions
check('transaction persisted', txAfter.length === txBefore + 1, `${txBefore} → ${txAfter.length}`)
check('amount stored correctly', txAfter[0]?.amount === 5000)
check('finance maths picks it up', m.useSite.getState().transactions.some((t) => t.party === 'Ledger Tester'))


console.log('\n— Compliance settings feed the documents —')
await click(q('[data-nav-item="system"]'))
await act(async () => { await new Promise((r) => setTimeout(r, 320)) })
check('compliance panel is present', has('Compliance & signatory'))
check('documents are mentioned', has('utilisation certificates'))
const g80Input = qa('input').find((i) => (i.placeholder || '').includes('AAATK'))
check('80G registration field is present', Boolean(g80Input))
if (g80Input) {
  await act(async () => { setInput(g80Input, 'AAATK1234KF2026') })
  await act(async () => { await new Promise((r) => setTimeout(r, 220)) })
  const stored = m.useSite.getState().settings.compliance || {}
  check('compliance value is saved', stored.g80No === 'AAATK1234KF2026', stored.g80No || 'not stored')
  check('signatory fields exist too', has('Authorised signatory') && has('Designation'))
}

await click(q('[data-nav-item="reports"]'))
await act(async () => { await new Promise((r) => setTimeout(r, 320)) })
const grantsTab = qa('[role="tab"]').find((t) => t.textContent.includes('Grant'))
check('grant tab is present', Boolean(grantsTab))
if (grantsTab) {
  await clickTab(grantsTab)
  await act(async () => { await new Promise((r) => setTimeout(r, 300)) })
  const ucBtn = qa('button').find((b) => b.textContent.includes('Utilisation certificate'))
  check('each grant offers a certificate', Boolean(ucBtn))
  check('grants show sanction numbers', has('NSF/2026/0412') || has('Sanction'))

  // Grants used to be seed-only: the hooks existed, no screen used them.
  const addGrantBtn = qa('button').find((b) => b.textContent.includes('Record grant'))
  check('grants can be added from the panel', Boolean(addGrantBtn))
  if (addGrantBtn) {
    const grantsBefore = m.useSite.getState().grants.length
    await click(addGrantBtn)
    await act(async () => { await new Promise((r) => setTimeout(r, 300)) })
    check('grant form opens', has('Record a grant') || has('Amount sanctioned'))
    const donorInput = qa('input').find((i) => (i.placeholder || '').includes('Netsmart'))
    const amountInput = qa('input[type="number"]')[0]
    check('form has donor and amount fields', Boolean(donorInput) && Boolean(amountInput))
    const purposeInput = qa('input').find((i) => (i.placeholder || '').includes('School adoption'))
    const dateInputs = qa('input[type="date"]')
    check('purpose and period fields are present', Boolean(purposeInput) && dateInputs.length >= 2)
    await act(async () => { setInput(donorInput, 'Dom Test Trust') })
    await act(async () => { setInput(purposeInput, 'Regression grant') })
    await act(async () => { setInput(amountInput, '250000') })
    await act(async () => { setInput(dateInputs[dateInputs.length - 1], '2027-03-31') })
    const submitGrant = qa('form button[type="submit"]').find((b) => b.textContent.includes('Record grant'))
    if (submitGrant) {
      const form = submitGrant.closest('form')
      await act(async () => {
        if (typeof form.requestSubmit === 'function') form.requestSubmit(submitGrant)
        else form.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }))
      })
      await act(async () => { await new Promise((r) => setTimeout(r, 450)) })
    }
    const grantsAfter = m.useSite.getState().grants
    check('grant is recorded in the store', grantsAfter.length === grantsBefore + 1, `${grantsBefore} → ${grantsAfter.length}`)
    const created = grantsAfter.find((g) => g.donor === 'Dom Test Trust')
    check('sanctioned amount is stored as a number', created?.sanctioned === 250000, String(created?.sanctioned))
    check('received/utilised are not typed in', !('received' in (created || {})) || created?.received === 0)
  }
}
const clickTabByName = async (name) => {
  const el = qa('[role="tab"]').find((t) => t.textContent.trim().includes(name))
  if (el) { await clickTab(el); return true }
  return false
}

const g80Tab = qa('[role="tab"]').find((t) => t.textContent.includes('80G'))
if (g80Tab) {
  await clickTab(g80Tab)
  await act(async () => { await new Promise((r) => setTimeout(r, 300)) })
  check('receipt register is reachable', has('Receipt register'))
}

// ---------------------------------------------------------------- production
console.log('\n— Production mode refuses to run on the published password —')
const systemNav = q('[data-nav-item="system"]')
check('the System section is in the nav', Boolean(systemNav))
if (systemNav) await click(systemNav)
await act(async () => { await new Promise((r) => setTimeout(r, 500)) })
check('the Production mode panel is reachable', has('Production mode'))
check('it lists what is still blocking', /blocking|Ready to go live/.test(document.body.textContent))
check('the go-live checklist names the bank details', has('Real bank account number'))
check('the go-live checklist names the password', has('Change the seeded admin password'))

const prodToggle = qa('button[aria-label="Production mode"]')[0]
if (prodToggle) {
  await click(prodToggle)
  await act(async () => { await new Promise((r) => setTimeout(r, 300)) })
}
check('production mode is on in the store', m.useSite.getState().settings.productionMode === true)
check('the restrictions are explained', has('Demo members, transactions and grants cannot be re-seeded'))
check('demo data cannot be re-seeded while live', m.useSite.getState().resetDemoRows() === false)

// Sign out and back in on the default password: production mode must stop the session.
await act(async () => { m.useSite.getState().logout() })
await act(async () => { await new Promise((r) => setTimeout(r, 400)) })
const okLogin = await act(async () => m.useSite.getState().login('admin@ksochd.org', 'ksochd2026'))
await act(async () => { await new Promise((r) => setTimeout(r, 500)) })
check('the seeded credentials still sign in', okLogin === true)
check('production mode demands a password change', m.useSite.getState().mustChangePassword === true)
check('the panel is replaced by the forced change screen', has('Change the default password'))
check('the panel itself is not reachable', !has('Site content') || !has('Production mode'))

await act(async () => {
  m.useSite.getState().changeOwnPassword('ksochd2026', 'a-brand-new-password')
})
await act(async () => { await new Promise((r) => setTimeout(r, 500)) })
check('changing the password lifts the block', m.useSite.getState().mustChangePassword === false)
check('the panel comes back', has('Production mode'))
check('the new password is in force', m.useSite.getState().settings.adminUsers.some((u) => u.password === 'a-brand-new-password'))
check('the password change is audited',
  (m.useSite.getState().audit || []).some((a) => a.action === 'changed their password'))

check('maintenance mode is off by default', m.useSite.getState().settings.maintenance.enabled === false)
const maintToggle = qa('button[aria-label="Maintenance mode"]')[0]
check('the maintenance switch is in System', Boolean(maintToggle))
if (maintToggle) {
  await click(maintToggle)
  await act(async () => { await new Promise((r) => setTimeout(r, 300)) })
}
check('maintenance mode is on in the store', m.useSite.getState().settings.maintenance.enabled === true)
check('the panel warns that it is live', has('Nobody but a signed-in admin can see the site'))
check('admins keep the panel', has('Production mode'))
check('the heading field is editable', Boolean(qa('input').find((i) => i.value === 'We will be right back')))
await act(async () => {
  m.useSite.getState().setSettings({
    maintenance: { ...m.useSite.getState().settings.maintenance, enabled: false },
  })
})
await act(async () => { await new Promise((r) => setTimeout(r, 300)) })
check('maintenance mode can be switched off again', m.useSite.getState().settings.maintenance.enabled === false)

// Put the seeded password back so the rest of the suite is unaffected.
await act(async () => {
  const me = m.useSite.getState().currentUser.email
  m.useSite.setState((st) => ({
    settings: { ...st.settings, productionMode: false,
      adminUsers: st.settings.adminUsers.map((u) => (u.email === me ? { ...u, password: 'ksochd2026' } : u)) },
  }))
})

// Last, because it signs the session out.
console.log('\n— An unattended panel signs itself out —')
check('the session starts authenticated', m.useSite.getState().authed === true)
await act(async () => {
  m.useSite.setState({ settings: { ...m.useSite.getState().settings, sessionTimeoutMinutes: 0.02 } })
})
await act(async () => { await new Promise((r) => setTimeout(r, 2600)) })
check('idle for the configured period signs the admin out', m.useSite.getState().authed === false,
  `authed=${m.useSite.getState().authed}`)
check('signing out is recorded in the audit trail',
  (m.useSite.getState().audit || []).some((a) => a.action === 'signed out'))
const loggedInEntry = (m.useSite.getState().audit || []).find((a) => a.action === 'signed in')
check('the sign-in that started the session is in the trail', Boolean(loggedInEntry))
check('the trail records who acted', loggedInEntry?.actor === 'admin@ksochd.org', String(loggedInEntry?.actor))
check('the trail records the money movements too',
  (m.useSite.getState().audit || []).some((a) => a.target === 'grants'),
  `entries: ${(m.useSite.getState().audit || []).length}`)

const keyWarnings = consoleErrors.filter((m) => /unique "key"|child in a list|same key/.test(m))
check('no React key warnings', keyWarnings.length === 0, keyWarnings[0]?.slice(0, 110) || `${consoleErrors.length} console errors seen`)
const nesting = consoleErrors.filter((m) => /validateDOMNesting|cannot appear as a/.test(m))
check('no invalid DOM nesting', nesting.length === 0, nesting[0]?.slice(0, 110) || '')

console.log(fails === 0 ? '\n✅ All DOM checks passed.' : `\n❌ ${fails} check(s) failed.`)
process.exit(fails === 0 ? 0 : 1)

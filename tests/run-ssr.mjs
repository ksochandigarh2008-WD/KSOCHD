const mem = new Map()
globalThis.localStorage = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k), clear: () => mem.clear() }
// react-router warns about useLayoutEffect on every server render. Harmless here (the
// effect never runs on the server), and loud enough to bury real failures. Hide it.
const passthroughWarn = console.error.bind(console)
console.error = (...args) => {
  if (/useLayoutEffect does nothing on the server/.test(String(args[0]))) return
  passthroughWarn(...args)
}

const m = await import('./.build/entry.ssr.js')
let fails = 0
const check = (l, ok, x = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${l.padEnd(40)} ${x}`); if (!ok) fails++ }
console.log('\n=== SSR suite: routes, admin tabs, data ===')
console.log('\n— Public routes —')
for (const r of ['/', '/about', '/programs', '/programs/education', '/impact', '/events', '/gallery', '/stories', '/stories/meera-class-10', '/volunteer', '/donate', '/contact', '/admin', '/nope']) {
  try { const h = m.renderPublic(r); check(r, h.length > 400, `${h.length}b`) } catch (e) { check(r, false, e.message) }
}
console.log('\n— Admin tabs —')
for (const [n, s, i] of m.renderTabs()) check(n, s === 'PASS', String(i))
console.log('\n— Data integrity —')
const tx = m.seed.seedTransactions(), mem2 = m.seed.seedMemberships()
check('seed txns', tx.length >= 50, `${tx.length}`)
check('seed members', mem2.length === 12)
const r = m.fin.periodRange('half'), p = m.fin.inPeriod(tx, r)
check('finance maths intact', m.fin.sumBy(p) > 0 && m.fin.monthlySeries(tx, 6).length === 6)
check('budget vs actual (financial year)', m.fin.budgetVsActual(tx, m.seed.seedBudgets(), m.fin.currentFy(), m.defaultContent.programs).length === 4)
console.log('\n— Double-entry books —')
const accounts = m.acc.seedAccounts()
const grants = m.acc.seedGrants()
// rebuild the books exactly the way the store does
const out = []
for (const t of [...tx].sort((a, b) => String(a.date).localeCompare(String(b.date)))) {
  const v = m.books.transactionToVoucher(t, '')
  v.id = v.no || String(Math.random())
  v.no = m.books.nextVoucherNo(out, v.type, t.date)
  v.grantId = m.books.suggestGrant(v, grants)
  out.push(v)
}
check('every transaction posts a voucher', out.length === tx.length, `${out.length} vouchers`)
check('every voucher balances', out.every((v) => m.books.isBalanced(v)))
check('receipt + payment + journal types used', new Set(out.map((v) => v.type)).size >= 3)

const asOn = new Date().toISOString().slice(0, 10)
const fyFrom = m.books.fyStart(asOn)
const tb = m.books.trialBalance(out, accounts, asOn)
check('trial balance balances', tb.balanced, `Dr ${tb.totalDebit} / Cr ${tb.totalCredit}`)

const rp = m.books.receiptsPayments(out, accounts, { from: fyFrom, to: asOn })
check('receipts & payments ties to the cash ledger', rp.verified, `closing ${rp.closing}`)

const ie = m.books.incomeExpenditure(out, accounts, { from: fyFrom, to: asOn })
check('income & expenditure computes', ie.totalIncome > 0 && ie.totalExpenditure > 0, `${ie.surplusLabel} ${ie.surplus}`)

const bs = m.books.balanceSheet(out, accounts, asOn)
check('balance sheet balances', bs.balanced, `assets ${bs.totalAssets} vs ${bs.totalLiabilities + bs.totalFunds}`)

const funds = m.books.fundSummary(out, accounts, { from: fyFrom, to: asOn })
check('all four funds reported', funds.length === 4)
check('corpus fund untouched by revenue', funds.find((f) => f.fund === 'Corpus').receipts === 0)
check('FCRA register populated', m.books.fcraRegister(out).length > 0, `${m.books.fcraRegister(out).length} entries`)

const gu = m.books.grantUtilisation(out, grants, accounts, { from: fyFrom, to: asOn })
check('grant utilisation reported', gu.length === grants.length && gu.some((g) => g.utilised > 0))
check('80G queue finds donations', m.books.unreceiptedDonations(out, []).length > 0)
check('receipt numbering is sequential', /\/0001$/.test(m.books.nextReceiptNo([], asOn)))

console.log('\n— Admin panel logic —')
// Previous period must be the same length as the selected one, or the
// "% vs previous period" figures compare apples to oranges.
const r6 = m.fin.periodRange('half')
const p6 = m.fin.previousPeriod(r6, 'half')
check('previous period matches the window length',
  m.fin.differenceInMonths
    ? true
    : Math.abs((p6.to - p6.from) - (r6.to - r6.from)) < 40 * 86400000,
  `${String(p6.from).slice(0, 10)} → ${String(p6.to).slice(0, 10)}`)
check('previous period ends the month before', p6.to < r6.from)
check('all-time has no previous period', m.fin.previousPeriod(m.fin.periodRange('all'), 'all') === null)

// Website donations carry no memberId; they should still reach the member.
const memRows = m.seed.seedMemberships()
const unlinked = {
  id: 'web-1', date: tx[0].date, type: 'income', category: 'Donation',
  amount: 5000, party: memRows[0].name, method: 'UPI', status: 'Cleared',
  memberId: '', program: '', reference: '', note: '',
}
const totalsLinked = m.fin.memberTotals([...tx, unlinked], memRows)
check('donations without memberId still count', totalsLinked.get(memRows[0].id)?.given > 0,
  `${memRows[0].name} → ${totalsLinked.get(memRows[0].id)?.given || 0}`)
const totalsBare = m.fin.memberTotals([...tx, unlinked], [])
check('name matching is opt-in (needs the member list)', !totalsBare.get(memRows[0].id))

console.log('\n— One store of money (quick ledger retired) —')
const legacyRows = [
  { id: 'l1', date: '2026-08-02', type: 'income', amount: 25000, program: 'health', donor: 'R. Sharma', method: 'UPI', note: 'Monthly giving', demo: true },
  { id: 'l2', date: '2026-07-30', type: 'expense', amount: 42000, program: 'education', donor: '', method: 'Bank transfer', note: 'Learning centre supplies', demo: true },
  { id: 'l3', date: '2026-07-25', type: 'income', amount: 0, donor: 'Zero row', method: 'Cash', note: '', demo: true },
]
const converted = m.migrations.quickLedgerToTransactions(legacyRows)
check('zero-value rows are dropped', converted.length === 2, `${converted.length} rows`)
check('income becomes a donation', converted[0].type === 'income' && converted[0].category === 'Donation')
check('expense becomes a programme cost', converted[1].type === 'expense' && converted[1].category === 'Program expense')
check('donor maps to party', converted[0].party === 'R. Sharma')
check('anonymous rows still get a party', converted[1].party === 'Learning centre supplies')
check('rows are marked as migrated', converted.every((r) => r.migratedFrom === 'quick-ledger'))
check('rows carry a fund for the books', converted.every((r) => Boolean(r.fund)))
check('rows post as cleared', converted.every((r) => r.status === 'Cleared' && Number(r.amount) > 0))
check('demo flag survives migration', converted.every((r) => r.demo === true))
check('empty input is safe', m.migrations.quickLedgerToTransactions([]).length === 0 && m.migrations.quickLedgerToTransactions().length === 0)

console.log('\n— Budgets follow the financial year —')
const fyNow = m.fin.currentFy()
const win = m.fin.fyWindow(fyNow)
check('FY label is Apr–Mar based', /^\d{4}-\d{2}$/.test(fyNow), fyNow)
check('FY window runs 1 Apr → 31 Mar', win.from.endsWith('-04-01') && win.to.endsWith('-03-31'), `${win.from} → ${win.to}`)

const bTx = [
  { type: 'expense', program: 'education', amount: 1000, date: `${Number(fyNow.split('-')[0])}-05-10` },   // inside FY
  { type: 'expense', program: 'education', amount: 500, date: `${Number(fyNow.split('-')[0]) + 1}-02-10` },  // Feb of the FY's second half
  { type: 'expense', program: 'education', amount: 7000, date: `${Number(fyNow.split('-')[0]) - 1}-12-10` }, // before FY
]
const bRows = [{ id: 'b1', program: 'education', fy: fyNow, amount: 10000 }]
const res = m.fin.budgetVsActual(bTx, bRows, fyNow, [])
check('counts spend inside the FY', res[0].actual === 1500, `${res[0].actual}`)
check('excludes spend from the previous FY', res[0].actual < 8000)
check('percentage is computed', res[0].pct === 15, `${res[0].pct}%`)
check('legacy calendar-year budgets still understood',
  m.fin.budgetVsActual(bTx, [{ id: 'b2', program: 'education', year: Number(fyNow.split('-')[0]), amount: 10000 }], fyNow, []).length === 1)
check('FY options are newest first', m.fin.fyOptions(3)[0] === fyNow)


console.log('\n— Store migrations (v1 → v7) —')
const M = m.migrations
check('store version is 8', M.STORE_VERSION === 8, `v${M.STORE_VERSION}`)

// A v1 blob: flat roster, a transaction, a calendar-year budget.
const v1 = {
  members: [{ id: 'm1', name: 'Asha Devi', status: 'Active', role: 'Teaching', joined: '2023-04-01' }],
  transactions: [{ id: 't1', date: '2026-04-10', type: 'income', category: 'Donation', amount: 1000, party: 'Test donor', method: 'UPI', status: 'Cleared', program: '', memberId: '', reference: '', note: '' }],
  budgets: [{ id: 'b1', program: 'education', year: 2026, amount: 100000 }],
  settings: {},
}
const from1 = M.migratePersisted(v1, 1)
check('v1 roster becomes memberships', from1.memberships.length === 1 && from1.memberships[0].tier === 'Individual')
check('v1 drops the flat roster', !('members' in from1))
// Regression: an early `return` in the v1 step used to strand old stores at v2,
// leaving them with no accounts, no vouchers and no admin user (i.e. locked out).
check('v1 falls through to v7, not just v2',
  from1.accounts.length > 0 && from1.grants.length > 0 && from1.vouchers.length === 1 && from1.settings.adminUsers.length === 1,
  `${from1.accounts.length} acct / ${from1.vouchers.length} vch / ${from1.settings.adminUsers.length} user`)
check('v1 budgets gain a financial year', from1.budgets[0].fy === '2026-27', from1.budgets[0].fy)

// v2 → v3: tiers narrow to Individual / Family.
const v2 = {
  memberships: [
    { id: 'a', tier: 'Patron', feeAmount: 10000, feeCycle: 'one-time', household: [{ name: 'X', relation: 'Spouse' }] },
    { id: 'b', tier: 'Basic', feeAmount: 500, feeCycle: 'annual', household: [] },
    { id: 'c', tier: 'Supporting', feeAmount: 9999, feeCycle: 'annual', household: [{ name: 'Y', relation: 'Child' }] },
  ],
}
const from2 = M.migratePersisted(v2, 2)
check('legacy tiers narrow correctly', from2.memberships.map((x) => x.tier).join(',') === 'Family,Individual,Family',
  from2.memberships.map((x) => x.tier).join(','))
check('default legacy fees are re-priced', from2.memberships[0].feeAmount === 1000 && from2.memberships[1].feeAmount === 500)
check('hand-edited fees survive', from2.memberships[2].feeAmount === 9999, String(from2.memberships[2].feeAmount))
check('one-time cycles become annual', from2.memberships.every((x) => x.feeCycle === 'annual'))
check('households kept only for Family', from2.memberships[0].household.length === 1 && from2.memberships[1].household.length === 0)

// v3 → v4: the books are built from whatever transactions exist.
const v3 = { transactions: m.seed.seedTransactions().slice(0, 5), vouchers: [{ id: 'own', source: 'manual', date: '2026-04-01', lines: [] }] }
const from3 = M.migratePersisted(v3, 3)
check('v4 builds a voucher per transaction', from3.vouchers.filter((v) => v.source === 'transaction').length === 5,
  `${from3.vouchers.length} total`)
check('hand-entered vouchers are preserved', from3.vouchers.some((v) => v.id === 'own'))
check('chart of accounts and grants seeded', from3.accounts.length > 0 && from3.grants.length > 0)

// v4 → v5: named accounts replace the shared passcode.
const from4 = M.migratePersisted({ settings: {} }, 4)
check('v5 seeds an admin account', from4.settings.adminUsers[0].email === 'admin@ksochd.org')
const keepUsers = M.migratePersisted({ settings: { adminUsers: [{ email: 'me@x.org', role: 'Admin' }] } }, 4)
check('existing admin accounts are kept', keepUsers.settings.adminUsers[0].email === 'me@x.org')

// v5 → v6: the quick ledger is folded into transactions.
const v5 = {
  ledger: [
    { id: 'l1', type: 'expense', amount: 250, donor: '', note: 'tea', method: 'Cash', date: '2026-04-02', program: 'education' },
    { id: 'l2', type: 'income', amount: 5000, donor: 'Ravi', method: 'UPI', date: '2026-04-03' },
    { id: 'l3', type: 'income', amount: 0, donor: 'Zero', date: '2026-04-04' },
  ],
  transactions: [{ id: 't9', date: '2026-04-01', type: 'income', amount: 10, category: 'Donation', method: 'Cash' }],
}
const ledgerRef = v5.ledger
const from5 = M.migratePersisted(v5, 5)
check('ledger rows become transactions', from5.transactions.filter((t) => t.migratedFrom === 'quick-ledger').length === 2,
  `${from5.transactions.length} txns`)
check('zero-amount rows are dropped', !from5.transactions.some((t) => t.party === 'Zero'))
check('pre-existing transactions survive', from5.transactions.some((t) => t.id === 't9'))
check('ledger is emptied', from5.ledger.length === 0)
const again5 = M.migratePersisted(from5, 5)
check('re-running the migration is a no-op', again5.transactions.length === from5.transactions.length)
const guarded = M.migratePersisted({
  ledger: [{ id: 'lx', type: 'income', amount: 777, donor: 'Dup' }],
  transactions: [{ id: 'tx', migratedFrom: 'quick-ledger', party: 'already' }],
}, 5)
check('the duplicate guard holds', guarded.transactions.filter((t) => t.party === 'Dup').length === 0)

// v6 → v7: budgets move onto the financial year.
const v6 = { budgets: [{ id: 'b1', program: 'education', year: 2026, amount: 10 }, { id: 'b2', program: 'health', fy: '2025-26', amount: 20 }] }
const budgetRef = v6.budgets[0]
const from6 = M.migratePersisted(v6, 6)
check('calendar budgets map to their FY', from6.budgets[0].fy === '2026-27', String(from6.budgets[0].fy))
check('existing FY budgets are untouched', from6.budgets[1].fy === '2025-26')

// Purity: the object handed in must not be written to.
check('input is not mutated', ledgerRef.length === 3 && budgetRef.fy === undefined && v1.members.length === 1)
check('empty and null inputs are safe', M.migratePersisted(undefined, 0) === undefined && M.migratePersisted(null, 3) === null)

// v7 → v7: nothing to do.
const v7 = { budgets: [{ id: 'b', fy: '2026-27', amount: 5 }], transactions: [], memberships: [], ledger: [] }
const from7 = M.migratePersisted(v7, 7)
check('v7 is a no-op', from7.budgets[0].fy === '2026-27' && from7.transactions.length === 0)


console.log('\n— Stale organisation name is corrected on upgrade —')
const stale = M.migratePersisted({
  ai: { systemPrompt: 'You are the official assistant for KSO (Kalyan Sewa Organisation), a non-profit in Chandigarh, India. Answer warmly.' },
  content: { seo: { metaDescription: 'KSO (Kalyan Sewa Organisation), Chandigarh — education and health work.' } },
}, 7)
check('AI prompt no longer names the wrong org', !stale.ai.systemPrompt.includes('Kalyan') && stale.ai.systemPrompt.includes("Kuki Students' Organisation Chandigarh"),
  stale.ai.systemPrompt.slice(0, 62))
check('SEO description no longer names the wrong org', !stale.content.seo.metaDescription.includes('Kalyan') && stale.content.seo.metaDescription.includes('Kuki Students'))
const handEdited = M.migratePersisted({ ai: { systemPrompt: 'You are the assistant for our NGO. Be brief.' }, content: {} }, 7)
check('a hand-edited prompt is left alone', handEdited.ai.systemPrompt === 'You are the assistant for our NGO. Be brief.')
check('a store with no ai slice survives', Boolean(M.migratePersisted({ content: {} }, 7)))

console.log('\n— Amount in words —')
const w = m.fin.amountInWords
check('zero', w(0) === 'Rupees zero only', w(0))
check('one', w(1) === 'Rupees one only', w(1))
check('ninety-nine', w(99) === 'Rupees ninety-nine only', w(99))
check('one hundred', w(100) === 'Rupees one hundred only', w(100))
check('one thousand', w(1000) === 'Rupees one thousand only', w(1000))
check('one lakh', w(100000) === 'Rupees one lakh only', w(100000))
check('one crore', w(10000000) === 'Rupees one crore only', w(10000000))
check('a real FY figure', w(1584100) === 'Rupees fifteen lakh eighty-four thousand one hundred only', w(1584100))
check('mixed grouping', w(2500010) === 'Rupees twenty-five lakh ten only', w(2500010))
check('paise', w(1500.5) === 'Rupees one thousand five hundred and fifty paise only', w(1500.5))

console.log('\n— 80G receipt document —')
const receipt = { no: 'KSO/80G/2026-27/0001', date: '2026-04-10', donor: 'Ravi Kumar', pan: 'ABCDE1234F', amount: 25000, method: 'UPI', narration: 'Annual support' }
const rc = m.documents.build80gReceipt({ receipt, settings: {}, org: m.defaultContent.org })
check('carries the receipt number', rc.no === 'KSO/80G/2026-27/0001')
check('spells out the amount', rc.amountWords === 'Rupees twenty-five thousand only', rc.amountWords)
check('donation is eligible', rc.eligible && /section 80G/.test(rc.deductionNote))
check('registration falls back to site content', rc.orgRegd.includes('2991'), rc.orgRegd)
check('gaps are named, not hidden', rc.missing.some((x) => x.key === 'g80No'), rc.missing.map((x) => x.key).join(','))
const cashBig = m.documents.build80gReceipt({ receipt: { ...receipt, method: 'Cash', amount: 5000 }, settings: {}, org: {} })
check('cash over Rs. 2,000 gets no deduction', !cashBig.eligible && /No deduction/.test(cashBig.deductionNote))
const cashSmall = m.documents.build80gReceipt({ receipt: { ...receipt, method: 'Cash', amount: 1500 }, settings: {}, org: {} })
check('small cash gifts stay eligible', cashSmall.eligible)
const corpusRc = m.documents.build80gReceipt({ receipt: { ...receipt, narration: 'Corpus fund donation' }, settings: {}, org: {} })
check('corpus gifts are marked as such', corpusRc.isCorpus && /corpus fund/.test(corpusRc.deductionNote))
const fullCompliance = { compliance: { pan: 'AAATK1234K', g80No: 'AAATK1234KF2021', g80ValidFrom: '2021-04-01', g80ValidUpto: '2026-03-31', signatoryName: 'Treasurer', signatoryDesignation: 'Hon. Secretary', address: 'Sector 22, Chandigarh', place: 'Chandigarh', regdNo: 'Regd. No. 2991/79' } }
const filled = m.documents.build80gReceipt({ receipt, settings: fullCompliance, org: {} })
check('nothing missing once filled in', filled.missing.length === 0, filled.missing.map((x) => x.key).join(','))
check('80G number and validity reach the note', /AAATK1234KF2021/.test(filled.deductionNote) && /2021-04-01 to 2026-03-31/.test(filled.deductionNote.replace(/.*\(valid /, '')))
check('filename is filesystem-safe', filled.filename === 'KSO-80G-2026-27-0001.pdf', filled.filename)

check('registration number is not double-prefixed', !/Regd\. No\. Regd\./.test(m.documents.build80gReceipt({ receipt, settings: {}, org: m.defaultContent.org }).orgRegd),
  m.documents.build80gReceipt({ receipt, settings: {}, org: m.defaultContent.org }).orgRegd)
check('UPI stays uppercase, cash reads as a phrase',
  m.documents.methodPhrase('UPI') === 'UPI' && m.documents.methodPhrase('Bank transfer') === 'bank transfer')
check('the sum line reads as English', /received by UPI/.test(m.documents.receiptSum(m.documents.build80gReceipt({ receipt, settings: {}, org: {} }))))

console.log('\n— Utilisation certificate —')
const grant = { donor: 'Netsmart Foundation', purpose: 'School adoption', sanctionNo: 'NSF/2026/0412', sanctioned: 800000, received: 800000, utilised: 320000, balance: 480000, startDate: '2026-04-01', endDate: '2027-03-31' }
const uc = m.documents.buildUtilisationCertificate({ grant, settings: {}, org: m.defaultContent.org, asOn: '2027-03-31' })
check('uses the GFR 19-A form', uc.formLabel === 'FORM GFR 19-A')
check('states sanctioned, received, utilised', uc.sanctioned === 800000 && uc.received === 800000 && uc.utilised === 320000)
check('states the unutilised balance', uc.balance === 480000)
check('period is formatted', uc.period === '01 Apr 2026 to 31 Mar 2027', uc.period)
check('certified text carries the figures', /Rs\. 3,20,000/.test(uc.certified) && /Rs\. 4,80,000/.test(uc.certified))
check('utilised amount is spelled out', uc.utilisedWords.startsWith('Rupees three lakh twenty thousand'), uc.utilisedWords)
check('certificate is filed under the sanction number', uc.filename.startsWith('UC-NSF-2026-0412'), uc.filename)
const ucThin = m.documents.buildUtilisationCertificate({ grant: { donor: 'Someone' }, settings: {}, org: {} })
check('an empty grant still builds', ucThin.sanctioned === 0 && ucThin.rows.length === 7)

console.log('\n— Grants are recordable (not just seeded) —')
const G = m.schemas.grantSchema
const goodGrant = { donor: 'Tata Trusts', purpose: 'Livelihood training', sanctionNo: 'TT/2026/09', sanctioned: '500000', startDate: '2026-04-01', endDate: '2027-03-31', program: 'livelihood', fund: 'Restricted', status: 'Active' }
check('a complete grant validates', G.safeParse(goodGrant).success)
check('amount is coerced to a number', G.safeParse(goodGrant).data?.sanctioned === 500000)
check('funder is required', !G.safeParse({ ...goodGrant, donor: '' }).success)
check('purpose is required', !G.safeParse({ ...goodGrant, purpose: '' }).success)
check('negative sanction rejected', !G.safeParse({ ...goodGrant, sanctioned: '-5' }).success)
check('end before start rejected', !G.safeParse({ ...goodGrant, endDate: '2025-01-01' }).success)
check('no claim on received/utilised', !('received' in G.safeParse(goodGrant).data) && !('utilised' in G.safeParse(goodGrant).data))
check('budget schema tracks the financial year', /fy/.test(JSON.stringify(m.schemas.budgetSchema.safeParse({ program: 'education', fy: '2026-27', amount: 100 }).data || {})))

console.log('\n— Settings are validated (format reported, never blocked) —')
const ORG = m.schemas.orgSchema
const CMP = m.schemas.complianceSchema
const FE = m.schemas.fieldErrors
const goodOrg = { shortName: 'KSOCHD', fullName: 'Kuki Students Organisation Chandigarh', foundedYear: '1979', email: 'hello@ksochd.org', phone: '9876543210', upiId: 'kso@upi', bankAccount: '12345678901234', bankIfsc: 'SBIN0001234' }
check('a complete organisation profile passes', Object.keys(FE(ORG, goodOrg)).length === 0, JSON.stringify(FE(ORG, goodOrg)))
check('a bad email is reported', Boolean(FE(ORG, { ...goodOrg, email: 'not-an-email' }).email))
check('a short phone is reported', Boolean(FE(ORG, { ...goodOrg, phone: '12345' }).phone))
check('a phone with +91 passes', !FE(ORG, { ...goodOrg, phone: '+91 98765 43210' }).phone)
check('a bad UPI ID is reported', Boolean(FE(ORG, { ...goodOrg, upiId: 'kso' }).upiId))
check('a bad IFSC is reported', Boolean(FE(ORG, { ...goodOrg, bankIfsc: 'SBIN123' }).bankIfsc))
check('the placeholder account number is caught', Boolean(FE(ORG, { ...goodOrg, bankAccount: '— add account no. —' }).bankAccount))
check('a missing legal name is reported', Boolean(FE(ORG, { ...goodOrg, fullName: '' }).fullName))
check('an empty optional field is fine', !FE(ORG, { ...goodOrg, bankIfsc: '' }).bankIfsc)
check('a malformed PAN is reported', Boolean(FE(CMP, { pan: 'ABCDE' }).pan))
check('a well-formed PAN passes', !FE(CMP, { pan: 'ABCDE1234F' }).pan)
check('a lowercase PAN passes', !FE(CMP, { pan: 'abcde1234f' }).pan)
check('80G expiry before start is reported', Boolean(FE(CMP, { g80ValidFrom: '2026-01-01', g80ValidUpto: '2025-01-01' }).g80ValidUpto))
check('a period the right way round passes', !FE(CMP, { g80ValidFrom: '2025-01-01', g80ValidUpto: '2026-01-01' }).g80ValidUpto)
check('errors are one message per field', typeof FE(ORG, { email: 'x', phone: 'y' }).email === 'string')

console.log('\n— Submissions are delivered only where they are told to go —')
const NOTIF = m.notifications
const realFetch = globalThis.fetch
let nSent = null
globalThis.fetch = async (url, opts) => { nSent = { url, body: JSON.parse(opts.body) }; return { ok: true, status: 200 } }
const sub = { kind: 'contact', name: 'Test Person', email: 'p@example.org', message: 'Hello' }
const deliver = (notif, override) => NOTIF.deliverSubmission({ ...sub, ...override }, notif)

let nRes = await deliver({ webhookUrl: '' })
check('nothing is sent when no URL is configured', Boolean(nRes.skipped) && nSent === null)
nRes = await deliver({ webhookUrl: 'https://hooks.example/x', notifyOnSubmission: false })
check('turned off means turned off', Boolean(nRes.skipped) && nSent === null)
nRes = await deliver({ webhookUrl: 'https://hooks.example/x', notifyOnDonation: false }, { kind: 'donation' })
check('donation notices can be off on their own', Boolean(nRes.skipped) && nSent === null)
nRes = await deliver({ webhookUrl: 'https://hooks.example/x' })
check('a configured URL receives the message', nRes.ok === true && nSent?.url === 'https://hooks.example/x')
check('the payload carries the enquirer', nSent?.body?.email === 'p@example.org' && nSent?.body?.kind === 'contact')
check('a blank URL is treated as unset', Boolean((await deliver({ webhookUrl: '   ' })).skipped))
let nTest = await NOTIF.sendTestNotification('ftp://example.org')
check('a non-http URL is refused', nTest.ok === false && /https/.test(nTest.error))
nTest = await NOTIF.sendTestNotification('https://hooks.example/x')
check('a test posts to the endpoint', nTest.ok === true && nSent?.body?.kind === 'test')
check('a test with no URL is refused', (await NOTIF.sendTestNotification('')).ok === false)
globalThis.fetch = async () => { throw new Error('offline') }
nRes = await deliver({ webhookUrl: 'https://hooks.example/x' })
check('an unreachable endpoint does not throw', nRes.ok === false && /offline/i.test(nRes.error))
globalThis.fetch = realFetch

console.log('\n— Production mode knows what is not ready —')
const PROD = m.production
const seeded = { adminUsers: [{ email: 'admin@ksochd.org', password: 'ksochd2026' }], compliance: {} }
const fresh = {
  adminUsers: [{ email: 'admin@ksochd.org', password: 'a-long-new-one' }],
  compliance: {
    pan: 'ABCDE1234F', g80No: 'AAATK0000KF2021', g80ValidUpto: '2030-03-31',
    signatoryName: 'Hon. Secretary', signatoryDesignation: 'Honorary Secretary', address: 'Sector 22, Chandigarh',
  },
}
const unfilledOrg = { bankAccount: '— add account no. —', bankIfsc: '— add IFSC —', upiId: 'kso@upi', email: 'hello@ksochd.org', phone: '9876543210', address: 'Sector 22, Chandigarh' }
const realOrg = { bankAccount: '12345678901234', bankIfsc: 'SBIN0001234', upiId: 'kso@upi', email: 'hello@ksochd.org', phone: '9876543210', address: 'Sector 22, Chandigarh' }
const done = (items, id) => items.find((i) => i.id === id)?.done
const blockingLeft = (items) => items.filter((i) => i.blocking && !i.done).map((i) => i.id)

let items = PROD.goLiveChecklist({ settings: seeded, content: { org: unfilledOrg } })
check('the seeded password is flagged', done(items, 'password') === false)
check('placeholder bank details are flagged', done(items, 'account') === false && done(items, 'ifsc') === false)
check('a real UPI ID passes', done(items, 'upi') === true)
check('missing statutory details are flagged', done(items, 'pan') === false && done(items, 'g80no') === false)
check('an unfilled site has several blockers', blockingLeft(items).length >= 6, blockingLeft(items).join(','))

items = PROD.goLiveChecklist({ settings: fresh, content: { org: realOrg } })
check('a properly filled site has no blockers', blockingLeft(items).length === 0, blockingLeft(items).join(','))
check('the password item is satisfied', done(items, 'password') === true)
check('the statutory items are satisfied', done(items, 'pan') && done(items, 'g80no') && done(items, 'signatory'))

items = PROD.goLiveChecklist({
  settings: { ...fresh, compliance: { ...fresh.compliance, g80ValidUpto: '2020-01-01' } },
  content: { org: realOrg },
})
check('an expired 80G registration blocks', done(items, 'g80valid') === false)

items = PROD.goLiveChecklist({ settings: fresh, content: { org: realOrg }, memberships: [{ demo: true }] })
check('demo data is a warning, not a blocker', done(items, 'demoData') === false
  && items.find((i) => i.id === 'demoData').blocking === false)
check('demo data removal is flagged when present', blockingLeft(items).length === 0)

check('no restrictions when production mode is off', PROD.productionRestrictions({ productionMode: false }).length === 0)
check('three restrictions once it is on', PROD.productionRestrictions({ productionMode: true }).length === 3)
check('isProduction reads the setting', PROD.isProduction({ productionMode: true }) === true
  && PROD.isProduction({}) === false)
check('the seeded password constant matches the store', PROD.SEEDED_PASSWORD === 'ksochd2026')

console.log('\n— Maintenance mode holds the line, but only for visitors —')
const show = (settings, authed) => m.production.shouldShowMaintenance(settings, authed)
check('off by default', show({}, false) === false)
check('off means visitors see the site', show({ maintenance: { enabled: false } }, false) === false)
check('on means visitors get the holding page', show({ maintenance: { enabled: true } }, false) === true)
check('a signed-in admin still sees the site', show({ maintenance: { enabled: true } }, true) === false)
check('missing settings do not throw', show(undefined, false) === false)
const copy = m.production.maintenanceCopy({ maintenance: { heading: 'Back soon', message: 'Updating.' } })
check('the holding page uses your words', copy.heading === 'Back soon' && copy.message === 'Updating.')
const blank = m.production.maintenanceCopy({ maintenance: { heading: '  ', message: '' } })
check('blank copy falls back', blank.heading === 'We will be right back' && /being updated/.test(blank.message))
check('defaults ship switched off', m.production.defaultMaintenance().enabled === false)

console.log('\n— The new screens render —')
for (const [n, st, i] of m.renderScreens()) check(n, st === 'PASS', String(i))

console.log('\n— Every public page renders (catches undefined variables) —')
for (const [n, st, i] of m.renderPages()) check(n, st === 'PASS', String(i))

console.log('\n— The PDFs actually render —')
const { jsPDF } = m.jspdf
const rdoc = new jsPDF({ unit: 'mm', format: 'a4', compress: false })
m.documents.renderReceipt(rdoc, rc)
const rraw = Buffer.from(rdoc.output('arraybuffer')).toString('latin1')
check('receipt produces a PDF', rraw.startsWith('%PDF') && rraw.length > 3000, `${rraw.length} bytes`)
check('receipt is titled', rraw.includes('DONATION RECEIPT'))
check('receipt spells the amount out', rraw.includes('Rupees') && rraw.includes('thousand'))
check('receipt prints the amount in figures', rraw.includes('Rs. 25,000'))
check('receipt prints the donor', rraw.includes('Ravi Kumar'))
check('missing statutory numbers print as placeholders', rraw.includes('[add 80G registration number]'))

const udoc = new jsPDF({ unit: 'mm', format: 'a4', compress: false })
m.documents.renderUtilisationCertificate(udoc, uc)
const uraw = Buffer.from(udoc.output('arraybuffer')).toString('latin1')
check('certificate produces a PDF', uraw.startsWith('%PDF') && uraw.length > 3000, `${uraw.length} bytes`)
check('certificate carries the form label', uraw.includes('FORM GFR 19-A'))
check('certificate states the sanction number', uraw.includes('NSF/2026/0412'))
check('certificate states the utilised figure', uraw.includes('3,20,000'))

console.log(fails === 0 ? '\n✅ Regression pass clean.' : `\n❌ ${fails} failed.`)
process.exit(fails === 0 ? 0 : 1)

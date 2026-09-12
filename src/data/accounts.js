/**
 * CHART OF ACCOUNTS + FUNDS for the double-entry books.
 *
 * Numbering follows the convention most Indian NGOs use:
 *   1xxx Assets · 2xxx Liabilities · 3xxx Funds · 4xxx Income · 5xxx Expenditure
 *
 * Opening balances are seeded so the Balance Sheet balances on day one
 * (Assets = Liabilities + Funds). The Unrestricted fund is derived rather than
 * hard-coded, so editing any other opening figure can never break that identity.
 *
 * All rows are tagged `demo: true` — replace them with your real ledger in
 * Admin → Accounts → Chart of accounts, or clear them with "Remove demo data".
 */

import { v4 as uuidv4 } from 'uuid'

export const ACCOUNT_GROUPS = ['Assets', 'Liabilities', 'Funds', 'Income', 'Expenditure']

/** Fund accounting buckets required for NGO reporting in India. */
export const FUNDS = ['Unrestricted', 'Restricted', 'Corpus', 'FCRA']
export const FUND_LABELS = {
  Unrestricted: 'Unrestricted / general fund',
  Restricted: 'Restricted (grant, CSR, earmarked)',
  Corpus: 'Corpus fund',
  FCRA: 'FCRA — foreign contribution',
}

/** Cash and bank accounts — used by the Receipts & Payments account. */
export const CASH_CODES = ['1001', '1002', '1003']

/**
 * Rows: code, name, group, subGroup, opening, openingType ('Dr' | 'Cr'), note
 * A null opening on the Unrestricted fund means "derive it" (see seedAccounts).
 */
const ROWS = [
  // ---------------------------------------------------------------- Assets
  ['1001', 'Cash in hand', 'Assets', 'Current assets', 12_000, 'Dr', 'Petty cash at the office'],
  ['1002', 'Bank — HDFC (main a/c)', 'Assets', 'Current assets', 450_000, 'Dr', 'Primary operating account'],
  ['1003', 'Bank — SBI (savings)', 'Assets', 'Current assets', 280_000, 'Dr', 'Savings and local receipts'],
  ['1011', 'Fixed deposits', 'Assets', 'Investments', 500_000, 'Dr', 'Term deposits'],
  ['1021', 'Furniture & fixtures', 'Assets', 'Fixed assets', 180_000, 'Dr', ''],
  ['1022', 'Computers & equipment', 'Assets', 'Fixed assets', 240_000, 'Dr', ''],
  ['1023', 'Vehicles', 'Assets', 'Fixed assets', 350_000, 'Dr', ''],
  ['1031', 'Advances & deposits', 'Assets', 'Current assets', 25_000, 'Dr', 'Rent deposit, vendor advances'],
  ['1041', 'TDS receivable', 'Assets', 'Current assets', 0, 'Dr', 'Tax deducted at source, recoverable'],

  // ----------------------------------------------------------- Liabilities
  ['2001', 'Sundry creditors', 'Liabilities', 'Current liabilities', 45_000, 'Cr', 'Vendors and suppliers'],
  ['2011', 'TDS payable', 'Liabilities', 'Current liabilities', 8_000, 'Cr', 'Tax deducted, not yet deposited'],
  ['2021', 'Salaries payable', 'Liabilities', 'Current liabilities', 0, 'Cr', ''],
  ['2031', 'Audit & legal fees payable', 'Liabilities', 'Current liabilities', 0, 'Cr', ''],

  // ----------------------------------------------------------------- Funds
  ['3101', 'Corpus fund', 'Funds', 'Corpus', 1_500_000, 'Cr', 'Permanent endowment — income only is spendable'],
  ['3301', 'Restricted grant fund', 'Funds', 'Restricted', 120_000, 'Cr', 'Grants and CSR, spendable only for purpose'],
  ['3401', 'FCRA fund', 'Funds', 'FCRA', 300_000, 'Cr', 'Foreign contribution, separate bank + separate books'],
  ['3201', 'Unrestricted fund', 'Funds', 'Unrestricted', null, 'Cr', 'Balancing figure: Assets − Liabilities − other funds'],

  // ---------------------------------------------------------------- Income
  ['4101', 'Donations — individual', 'Income', 'Donations', 0, 'Cr', ''],
  ['4102', 'Donations — corporate', 'Income', 'Donations', 0, 'Cr', ''],
  ['4103', 'Donations — in kind', 'Income', 'Donations', 0, 'Cr', 'Goods and services received, not cash'],
  ['4201', 'Membership fees', 'Income', 'Membership', 0, 'Cr', 'Individual ₹500 / Family ₹1,000 per year'],
  ['4301', 'Grants — CSR', 'Income', 'Grants', 0, 'Cr', 'Corporate social responsibility funding'],
  ['4302', 'Grants — institutional', 'Income', 'Grants', 0, 'Cr', 'Trusts, foundations, government'],
  ['4401', 'Event income', 'Income', 'Events', 0, 'Cr', 'Registrations, stalls, sponsorships'],
  ['4501', 'Interest income', 'Income', 'Other income', 0, 'Cr', 'Deposits and savings'],
  ['4601', 'Other income', 'Income', 'Other income', 0, 'Cr', ''],

  // ----------------------------------------------------------- Expenditure
  ['5101', 'Programme — education', 'Expenditure', 'Programme', 0, 'Dr', ''],
  ['5102', 'Programme — health', 'Expenditure', 'Programme', 0, 'Dr', ''],
  ['5103', 'Programme — livelihood', 'Expenditure', 'Programme', 0, 'Dr', ''],
  ['5104', 'Programme — community', 'Expenditure', 'Programme', 0, 'Dr', ''],
  ['5201', 'Salaries & honorarium', 'Expenditure', 'Establishment', 0, 'Dr', ''],
  ['5202', 'Travel & conveyance', 'Expenditure', 'Establishment', 0, 'Dr', ''],
  ['5203', 'Rent, rates & taxes', 'Expenditure', 'Establishment', 0, 'Dr', ''],
  ['5204', 'Electricity & water', 'Expenditure', 'Establishment', 0, 'Dr', ''],
  ['5205', 'Printing & stationery', 'Expenditure', 'Establishment', 0, 'Dr', ''],
  ['5206', 'Venue & logistics', 'Expenditure', 'Establishment', 0, 'Dr', ''],
  ['5207', 'Medicines & supplies', 'Expenditure', 'Programme', 0, 'Dr', ''],
  ['5208', 'Repairs & maintenance', 'Expenditure', 'Establishment', 0, 'Dr', ''],
  ['5209', 'Audit & legal fees', 'Expenditure', 'Establishment', 0, 'Dr', ''],
  ['5210', 'Bank charges', 'Expenditure', 'Establishment', 0, 'Dr', ''],
  ['5211', 'Depreciation', 'Expenditure', 'Establishment', 0, 'Dr', ''],
  ['5212', 'Food & refreshments', 'Expenditure', 'Programme', 0, 'Dr', ''],
  ['5213', 'Publicity & media', 'Expenditure', 'Establishment', 0, 'Dr', ''],
  ['5301', 'Other programme costs', 'Expenditure', 'Programme', 0, 'Dr', ''],
  ['5302', 'Gifts-in-kind distributed', 'Expenditure', 'Programme', 0, 'Dr', 'Contra to in-kind donations'],
]

/**
 * Where each finance category posts.
 * Programme expenses are routed by programme tag, so "Program expense" splits
 * across the four programme accounts instead of pooling into one.
 */
export const PROGRAMME_ACCOUNTS = {
  education: '5101', health: '5102', livelihood: '5103', community: '5104',
}

export const INCOME_ACCOUNT = {
  Donation: '4101',
  'Membership fee': '4201',
  Grant: '4302',
  CSR: '4301',
  'Event income': '4401',
  'In-kind': '4103',
  'Other income': '4601',
}

export const EXPENSE_ACCOUNT = {
  'Program expense': '5301', // upgraded to 5101-5104 when a programme is tagged
  'Salaries & stipends': '5201',
  'Medicines & supplies': '5207',
  'Venue & logistics': '5206',
  Utilities: '5204',
  Travel: '5202',
  'Printing & media': '5213',
  'Professional fees': '5209',
  'Bank charges': '5210',
  'Other expense': '5301',
}

/** Which cash or bank account a payment method touches. */
export const METHOD_ACCOUNT = {
  Cash: '1001',
  UPI: '1002',
  Card: '1002',
  Gateway: '1002',
  'Bank transfer': '1002',
  Cheque: '1002',
}

/** Donations whose donor name looks corporate post to the corporate head. */
const CORPORATE_HINT = /(foundation|trust|club|pvt|ltd|limited|industries|bank|corporation|society|infotech|technologies|ngo|sewa|seva)\b/i

export const seedAccounts = () => {
  const rows = ROWS.map(([code, name, group, subGroup, opening, openingType, note]) => ({
    id: uuidv4(),
    code,
    name,
    group,
    subGroup,
    opening: opening ?? 0,
    openingType,
    note,
    active: true,
    system: true,
    demo: true,
  }))

  // Derive the unrestricted fund so Assets = Liabilities + Funds always holds.
  // Everything is expressed as a signed debit (credit balances are negative).
  const signed = (a) => (a.openingType === 'Cr' ? -a.opening : a.opening)
  const sumSigned = (rows) => rows.reduce((sum, a) => sum + signed(a), 0)
  const assets = sumSigned(rows.filter((a) => a.group === 'Assets'))
  const liabilities = sumSigned(rows.filter((a) => a.group === 'Liabilities'))
  const otherFunds = sumSigned(rows.filter((a) => a.group === 'Funds' && a.code !== '3201'))

  // Whatever is left over belongs to the unrestricted fund.
  const unrestricted = rows.find((a) => a.code === '3201')
  const needed = -(assets + liabilities + otherFunds)
  unrestricted.opening = Math.abs(needed)
  unrestricted.openingType = needed < 0 ? 'Cr' : 'Dr'
  return rows
}

/** Demo grants — drives the Grants & CSR utilisation report. */
export const seedGrants = () => [
  {
    id: uuidv4(), donor: 'Netsmart Foundation', purpose: 'School adoption — Sector 22',
    sanctionNo: 'NSF/2026/0412', sanctioned: 800_000, received: 800_000,
    startDate: '2026-04-01', endDate: '2027-03-31', program: 'education',
    fund: 'Restricted', status: 'Active', demo: true,
  },
  {
    id: uuidv4(), donor: 'Rotary Club Chandigarh', purpose: 'Health camp equipment',
    sanctionNo: 'RCC/2025/1187', sanctioned: 450_000, received: 450_000,
    startDate: '2025-10-01', endDate: '2026-09-30', program: 'health',
    fund: 'Restricted', status: 'Active', demo: true,
  },
  {
    id: uuidv4(), donor: 'Helmsley Charitable Trust', purpose: 'Livelihood training centre',
    sanctionNo: 'HCT/F/23-24/77', sanctioned: 450_000, received: 430_000,
    startDate: '2025-07-01', endDate: '2026-12-31', program: 'livelihood',
    fund: 'FCRA', status: 'Active', demo: true,
  },
  {
    id: uuidv4(), donor: 'Tricity Marathon entries', purpose: 'Community sports day',
    sanctionNo: 'TM/2026/09', sanctioned: 184_000, received: 184_000,
    startDate: '2026-01-15', endDate: '2026-06-30', program: 'community',
    fund: 'Restricted', status: 'Closed', demo: true,
  },
]

/** Grants + CSR are restricted by nature; FCRA money must stay in the FCRA fund. */
export const fundForCategory = (category = '') =>
  (category === 'Grant' || category === 'CSR' ? 'Restricted' : 'Unrestricted')

/** Income account for a transaction — corporate donors are split out automatically. */
export const incomeAccountFor = (txn = {}) => {
  if (txn.category === 'Donation' && CORPORATE_HINT.test(txn.party || '')) return '4102'
  return INCOME_ACCOUNT[txn.category] || '4601'
}

/** Expenditure account for a transaction — programme tag wins over the category. */
export const expenseAccountFor = (txn = {}) =>
  (txn.category === 'Program expense' && PROGRAMME_ACCOUNTS[txn.program]) ||
  EXPENSE_ACCOUNT[txn.category] ||
  '5301'

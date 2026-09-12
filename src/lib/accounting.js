/**
 * DOUBLE-ENTRY ACCOUNTING ENGINE.
 *
 * Pure functions: vouchers + a chart of accounts go in, statements come out.
 * Nothing here touches React, the store or the network, so it can be unit-tested.
 *
 * Books model
 * -----------
 *   Account  — chart of accounts entry with an opening balance (Dr or Cr).
 *   Voucher  — one transaction with 2+ lines whose debits equal its credits.
 *              Receipt (money in), Payment (money out), Journal (non-cash),
 *              Contra (cash ↔ bank).
 *   Posting  — a single debit or credit line against one account.
 *
 * Statements produced
 * -------------------
 *   trialBalance    · ledger (per account) · receiptsPayments
 *   incomeExpenditure (I&E) · balanceSheet · fundSummary · grantUtilisation
 *
 * Money is rounded to paise at every step so totals never drift by a rupee.
 */

import { compareAsc } from 'date-fns'
import {
  CASH_CODES, FUNDS, PROGRAMME_ACCOUNTS,
  fundForCategory, incomeAccountFor, expenseAccountFor, METHOD_ACCOUNT,
} from '../data/accounts'

const num = (n) => Number(n) || 0
const round = (n) => Math.round((Number(n) || 0) * 100) / 100

export const VOUCHER_TYPES = ['Receipt', 'Payment', 'Journal', 'Contra']
export const VOUCHER_STATUS = ['Posted', 'Pending', 'Draft', 'Cancelled']
const VOUCHER_PREFIX = { Receipt: 'RV', Payment: 'PV', Journal: 'JV', Contra: 'CV' }

/** Indian financial year label for a date: 2026-04-01 → "2026-27". */
export const fyLabel = (date = new Date()) => {
  const d = typeof date === 'string' ? new Date(date) : date
  const y = d.getFullYear()
  const start = d.getMonth() >= 3 ? y : y - 1
  return `${start}-${String((start + 1) % 100).padStart(2, '0')}`
}

/** 1 April of the financial year containing `date`. */
export const fyStart = (date = new Date()) => {
  const d = typeof date === 'string' ? new Date(date) : date
  const y = d.getFullYear()
  return `${d.getMonth() >= 3 ? y : y - 1}-04-01`
}

const within = (date, from, to) => (!from || date >= from) && (!to || date <= to)

/* ------------------------------------------------------------------ *
 * Accounts
 * ------------------------------------------------------------------ */

/** Opening balance as a signed number: debit positive, credit negative. */
export const signedOpening = (a) => (a.openingType === 'Cr' ? -num(a.opening) : num(a.opening))

export const accountByCode = (accounts, code) => accounts.find((a) => a.code === code) || null
export const accountName = (accounts, code) => accountByCode(accounts, code)?.name || code
export const isCashAccount = (code) => CASH_CODES.includes(String(code))

export const accountsIn = (accounts, group) =>
  accounts.filter((a) => a.group === group && a.active !== false)

/** Chart of accounts grouped for display: { Assets: { 'Current assets': [...] } }. */
export const accountTree = (accounts) => {
  const out = {}
  for (const a of accounts) {
    out[a.group] ||= {}
    ;(out[a.group][a.subGroup || 'Other'] ||= []).push(a)
  }
  for (const g of Object.keys(out)) {
    for (const s of Object.keys(out[g])) out[g][s].sort((x, y) => x.code.localeCompare(y.code))
  }
  return out
}

/* ------------------------------------------------------------------ *
 * Vouchers
 * ------------------------------------------------------------------ */

export const voucherDebit = (v) => round((v.lines || []).reduce((s, l) => s + num(l.debit), 0))
export const voucherCredit = (v) => round((v.lines || []).reduce((s, l) => s + num(l.credit), 0))
export const isBalanced = (v) => Math.abs(voucherDebit(v) - voucherCredit(v)) < 0.01
export const voucherTotal = (v) => voucherDebit(v)

/** Next number in the series for that type and financial year. */
export const nextVoucherNo = (vouchers, type, date) => {
  const prefix = VOUCHER_PREFIX[type] || 'JV'
  const fy = fyLabel(date)
  const used = vouchers.filter((v) => v.no?.startsWith(`${prefix}-${fy}-`)).length
  return `${prefix}-${fy}-${String(used + 1).padStart(4, '0')}`
}

/**
 * Turn a single-entry finance transaction into a balanced voucher.
 * This is the bridge that keeps the existing money flow (donations, renewals,
 * manual entries) posting into proper books without changing any of it.
 */
export function transactionToVoucher(txn, no = '') {
  const amount = Math.abs(round(txn.amount))
  const fund = txn.fund || fundForCategory(txn.category)
  const program = txn.program || ''
  const tag = (account, debit, credit) => ({ account, debit: round(debit), credit: round(credit), fund, program })
  const base = {
    no,
    date: txn.date,
    party: txn.party || '',
    method: txn.method || '',
    reference: txn.reference || '',
    narration: txn.note || txn.party || '',
    program,
    fund,
    memberId: txn.memberId || '',
    amount,
    status: txn.status === 'Rejected' ? 'Cancelled' : txn.status === 'Pending' ? 'Pending' : 'Posted',
    source: 'transaction',
    sourceId: txn.id || '',
    demo: Boolean(txn.demo),
  }

  if (txn.type === 'expense') {
    // In-kind expense: no cash moves, so it is posted as a journal entry.
    const credit = METHOD_ACCOUNT[txn.method] || (txn.method === 'In-kind' ? '2001' : '1002')
    return {
      ...base,
      type: txn.method === 'In-kind' ? 'Journal' : 'Payment',
      lines: [tag(expenseAccountFor(txn), amount, 0), tag(credit, 0, amount)],
    }
  }

  if (txn.method === 'In-kind' || txn.category === 'In-kind') {
    // Goods received and distributed: income and an equal contra expense,
    // so the surplus is unaffected, which is the correct cash-basis treatment.
    return {
      ...base,
      type: 'Journal',
      lines: [tag('5302', amount, 0), tag('4103', 0, amount)],
    }
  }

  return {
    ...base,
    type: 'Receipt',
    lines: [tag(METHOD_ACCOUNT[txn.method] || '1002', amount, 0), tag(incomeAccountFor(txn), 0, amount)],
  }
}

/** Vouchers that count towards the books: everything except cancelled ones. */
export const posted = (vouchers, { from, to } = {}) =>
  vouchers
    .filter((v) => v.status !== 'Cancelled' && v.status !== 'Draft')
    .filter((v) => within(v.date, from, to))
    .sort((a, b) => compareAsc(new Date(a.date), new Date(b.date)) || a.no.localeCompare(b.no))

/** Flat list of every debit/credit line, with opening balances folded in first. */
export function postings(vouchers, accounts, { from, to, includeOpening = true } = {}) {
  const rows = []
  if (includeOpening) {
    for (const a of accounts) {
      const opening = signedOpening(a)
      if (!opening) continue
      rows.push({
        date: from ? `${from.slice(0, 4)}-04-01` : '0000-01-01',
        voucherNo: 'OPENING',
        type: 'Opening',
        account: a.code,
        debit: opening > 0 ? opening : 0,
        credit: opening < 0 ? -opening : 0,
        narration: 'Opening balance',
        fund: '',
        program: '',
      })
    }
  }
  for (const v of posted(vouchers, { from, to })) {
    for (const l of v.lines || []) {
      const debit = round(l.debit)
      const credit = round(l.credit)
      if (!debit && !credit) continue
      rows.push({
        date: v.date, voucherNo: v.no, type: v.type, account: l.account,
        debit, credit, narration: v.narration || v.party || '', fund: l.fund || v.fund || '',
        program: l.program || v.program || '', grantId: v.grantId || '',
      })
    }
  }
  return rows
}

/** Signed movement per account: debit − credit. */
export function accountTotals(vouchers, accounts, { from, to } = {}) {
  const map = new Map()
  const put = (code) => {
    if (!map.has(code)) map.set(code, { code, debit: 0, credit: 0 })
    return map.get(code)
  }
  for (const p of postings(vouchers, accounts, { from, to })) {
    const row = put(p.account)
    row.debit = round(row.debit + p.debit)
    row.credit = round(row.credit + p.credit)
  }
  return map
}

/** Closing balance per account as { net, drCr, debit, credit }. */
export function closingBalances(vouchers, accounts, { from, to } = {}) {
  const totals = accountTotals(vouchers, accounts, { from, to })
  const out = new Map()
  for (const a of accounts) {
    const t = totals.get(a.code) || { debit: 0, credit: 0 }
    const net = round(t.debit - t.credit)
    out.set(a.code, {
      code: a.code, name: a.name, group: a.group, subGroup: a.subGroup, net,
      drCr: net >= 0 ? 'Dr' : 'Cr',
      debit: net > 0 ? net : 0,
      credit: net < 0 ? -net : 0,
    })
  }
  return out
}

/* ------------------------------------------------------------------ *
 * Trial balance & ledger
 * ------------------------------------------------------------------ */

export function trialBalance(vouchers, accounts, asOn) {
  const rows = [...closingBalances(vouchers, accounts, { to: asOn }).values()]
    .filter((r) => Math.abs(r.net) >= 0.01)
    .map((r) => ({ ...r, amount: Math.abs(r.net) }))
    .sort((a, b) => a.code.localeCompare(b.code))
  const totalDebit = round(rows.filter((r) => r.drCr === 'Dr').reduce((s, r) => s + r.amount, 0))
  const totalCredit = round(rows.filter((r) => r.drCr === 'Cr').reduce((s, r) => s + r.amount, 0))
  return { rows, totalDebit, totalCredit, balanced: Math.abs(totalDebit - totalCredit) < 0.01 }
}

export function ledger(vouchers, accounts, code, { from, to } = {}) {
  const account = accountByCode(accounts, code)
  const before = accountTotals(vouchers, accounts, { to: from ? minusDay(from) : undefined }).get(code)
  const openingNet = before ? round(before.debit - before.credit) : 0
  const entries = postings(vouchers, accounts, { from, to, includeOpening: false })
    .filter((p) => p.account === code)
  let running = openingNet
  const rows = entries.map((p) => {
    running = round(running + p.debit - p.credit)
    return { ...p, balance: running, drCr: running >= 0 ? 'Dr' : 'Cr' }
  })
  return {
    account,
    opening: openingNet,
    openingDrCr: openingNet >= 0 ? 'Dr' : 'Cr',
    entries: rows,
    totalDebit: round(entries.reduce((s, p) => s + p.debit, 0)),
    totalCredit: round(entries.reduce((s, p) => s + p.credit, 0)),
    closing: running,
    closingDrCr: running >= 0 ? 'Dr' : 'Cr',
  }
}

const minusDay = (iso) => {
  const d = new Date(iso)
  d.setDate(d.getDate() - 1)
  return d.toISOString().slice(0, 10)
}

/* ------------------------------------------------------------------ *
 * Receipts & Payments account
 * ------------------------------------------------------------------ */

/**
 * Cash-basis summary: opening cash/bank, receipts and payments by head, closing.
 * The "head" is the non-cash side of each voucher (the donor or the expense).
 */
export function receiptsPayments(vouchers, accounts, { from, to } = {}) {
  const balances = closingBalances(vouchers, accounts, { to: from ? minusDay(from) : undefined })
  const opening = round(CASH_CODES.reduce((s, c) => s + (balances.get(c)?.net || 0), 0))

  const heads = new Map()
  const bump = (code, key, amount) => {
    const id = `${key}:${code}`
    if (!heads.has(id)) heads.set(id, { code, side: key, name: accountName(accounts, code), amount: 0 })
    heads.get(id).amount = round(heads.get(id).amount + amount)
  }

  for (const v of posted(vouchers, { from, to })) {
    const lines = v.lines || []
    for (const l of lines) {
      if (!isCashAccount(l.account)) continue
      const dr = round(l.debit)
      const cr = round(l.credit)
      if (!dr && !cr) continue
      const contra = lines.find((x) => x !== l && !isCashAccount(x.account)) || lines.find((x) => x !== l)
      if (!contra) continue
      if (dr) bump(contra.account, 'receipts', dr)
      if (cr) bump(contra.account, 'payments', cr)
    }
  }

  const all = [...heads.values()]
  const receipts = all.filter((h) => h.side === 'receipts').sort((a, b) => b.amount - a.amount)
  const payments = all.filter((h) => h.side === 'payments').sort((a, b) => b.amount - a.amount)
  const totalReceipts = round(receipts.reduce((s, h) => s + h.amount, 0))
  const totalPayments = round(payments.reduce((s, h) => s + h.amount, 0))
  const closingByAccount = CASH_CODES.map((c) => ({
    code: c,
    name: accountName(accounts, c),
    balance: closingBalances(vouchers, accounts, { to }).get(c)?.net || 0,
  })).filter((x) => Math.abs(x.balance) >= 0.01)

  return {
    opening, receipts, payments,
    totalReceipts, totalPayments,
    closing: round(opening + totalReceipts - totalPayments),
    closingByAccount,
    verified: Math.abs(round(opening + totalReceipts - totalPayments)
      - round(closingByAccount.reduce((s, x) => s + x.balance, 0))) < 0.01,
  }
}

/* ------------------------------------------------------------------ *
 * Income & Expenditure account
 * ------------------------------------------------------------------ */

const headTotals = (vouchers, accounts, group, { from, to }) => {
  const totals = accountTotals(vouchers, accounts, { from, to })
  return accountsIn(accounts, group)
    .map((a) => {
      const t = totals.get(a.code) || { debit: 0, credit: 0 }
      // Income carries a credit balance; expenditure a debit balance.
      const net = group === 'Income' ? round(t.credit - t.debit) : round(t.debit - t.credit)
      return { code: a.code, name: a.name, subGroup: a.subGroup, net, amount: Math.abs(net) }
    })
    .filter((r) => Math.abs(r.net) >= 0.01)
    .sort((a, b) => b.amount - a.amount)
}

export function incomeExpenditure(vouchers, accounts, { from, to } = {}) {
  const income = headTotals(vouchers, accounts, 'Income', { from, to })
  const expenditure = headTotals(vouchers, accounts, 'Expenditure', { from, to })
  const totalIncome = round(income.reduce((s, r) => s + r.net, 0))
  const totalExpenditure = round(expenditure.reduce((s, r) => s + r.net, 0))
  return {
    income, expenditure, totalIncome, totalExpenditure,
    surplus: round(totalIncome - totalExpenditure),
    surplusLabel: totalIncome - totalExpenditure >= 0 ? 'Surplus' : 'Deficit',
  }
}

/* ------------------------------------------------------------------ *
 * Balance sheet
 * ------------------------------------------------------------------ */

export function balanceSheet(vouchers, accounts, asOn) {
  const balances = closingBalances(vouchers, accounts, { to: asOn })
  const pick = (group) =>
    accountsIn(accounts, group)
      .map((a) => ({ code: a.code, name: a.name, subGroup: a.subGroup || 'Other', net: balances.get(a.code)?.net || 0 }))
      .filter((r) => Math.abs(r.net) >= 0.01)

  const assetsRows = pick('Assets').map((r) => ({ ...r, amount: r.net }))
  const liabilityRows = pick('Liabilities').map((r) => ({ ...r, amount: -r.net }))

  // Funds: closing balances of the fund accounts, plus the year's surplus
  // carried into the unrestricted fund.
  const ie = incomeExpenditure(vouchers, accounts, { from: fyStart(asOn), to: asOn })
  const fundRows = accountsIn(accounts, 'Funds').map((a) => ({
    code: a.code, name: a.name, subGroup: a.subGroup || 'Other',
    amount: round(-(balances.get(a.code)?.net || 0)),
  }))
  const unrestricted = fundRows.find((r) => r.code === '3201')
  if (unrestricted) unrestricted.amount = round(unrestricted.amount + ie.surplus)
  const fundsRows = fundRows.filter((r) => Math.abs(r.amount) >= 0.01)

  const totalAssets = round(assetsRows.reduce((s, r) => s + r.amount, 0))
  const totalLiabilities = round(liabilityRows.reduce((s, r) => s + r.amount, 0))
  const totalFunds = round(fundsRows.reduce((s, r) => s + r.amount, 0))

  return {
    asOn,
    assets: assetsRows,
    liabilities: liabilityRows,
    funds: fundsRows,
    totalAssets,
    totalLiabilities,
    totalFunds,
    surplus: ie.surplus,
    surplusLabel: ie.surplusLabel,
    difference: round(totalAssets - (totalLiabilities + totalFunds)),
    balanced: Math.abs(round(totalAssets - (totalLiabilities + totalFunds))) < 0.01,
  }
}

/* ------------------------------------------------------------------ *
 * Fund accounting (corpus / restricted / unrestricted / FCRA)
 * ------------------------------------------------------------------ */

const FUND_CAPITAL_ACCOUNT = { Corpus: '3101', Restricted: '3301', FCRA: '3401', Unrestricted: '3201' }

export function fundSummary(vouchers, accounts, { from, to } = {}) {
  const before = closingBalances(vouchers, accounts, { to: from ? minusDay(from) : undefined })
  return FUNDS.map((fund) => {
    const capital = FUND_CAPITAL_ACCOUNT[fund]
    const opening = round(-(before.get(capital)?.net || 0))
    let receipts = 0
    let payments = 0
    for (const v of posted(vouchers, { from, to })) {
      for (const l of v.lines || []) {
        const lineFund = l.fund || v.fund
        if (lineFund !== fund) continue
        const account = accountByCode(accounts, l.account)
        if (!account) continue
        if (account.group === 'Income') receipts = round(receipts + round(l.credit) - round(l.debit))
        if (account.group === 'Expenditure') payments = round(payments + round(l.debit) - round(l.credit))
      }
    }
    return {
      fund, capitalAccount: capital, opening, receipts, payments,
      closing: round(opening + receipts - payments),
    }
  })
}

/** Foreign-contribution register — every voucher touching the FCRA fund. */
export const fcraRegister = (vouchers) =>
  posted(vouchers)
    .filter((v) => v.fund === 'FCRA' || (v.lines || []).some((l) => l.fund === 'FCRA'))
    .sort((a, b) => b.date.localeCompare(a.date))

/* ------------------------------------------------------------------ *
 * Grants & CSR utilisation
 * ------------------------------------------------------------------ */

/** Best guess at which grant a voucher belongs to (editable in the UI). */
export const suggestGrant = (v, grants = []) => {
  if (v.type === 'Receipt') return grants.find((g) => g.donor === v.party)?.id || ''
  // Expenses are matched to a grant by programme and date window — the fund
  // tag on the voucher is often still "Unrestricted" at entry time.
  return grants.find((g) =>
    g.program === v.program &&
    within(v.date, g.startDate, g.endDate))?.id || ''
}

export function grantUtilisation(vouchers, grants = [], accounts = [], { from, to } = {}) {
  return grants.map((g) => {
    const mine = posted(vouchers, { from, to }).filter((v) => v.grantId === g.id)
    let received = 0
    let utilised = 0
    for (const v of mine) {
      for (const l of v.lines || []) {
        const a = accountByCode(accounts, l.account)
        if (!a) continue
        if (a.group === 'Income') received = round(received + round(l.credit) - round(l.debit))
        if (a.group === 'Expenditure') utilised = round(utilised + round(l.debit) - round(l.credit))
      }
    }
    // Utilisation is measured against what actually arrived: funders ask what
    // share of the money received has been spent for the purpose.
    const usable = received || num(g.sanctioned)
    return {
      ...g,
      received: round(received),
      utilised: round(utilised),
      balance: round(received - utilised),
      shortfall: round(num(g.sanctioned) - received),
      utilisation: usable ? Math.round((utilised / usable) * 100) : 0,
    }
  })
}

/* ------------------------------------------------------------------ *
 * 80G receipts
 * ------------------------------------------------------------------ */

export const nextReceiptNo = (receipts, date) => {
  const fy = fyLabel(date)
  const used = receipts.filter((r) => r.no?.includes(`/${fy}/`)).length
  return `KSO/80G/${fy}/${String(used + 1).padStart(4, '0')}`
}

/**
 * Membership fee receipts run in their own series.
 *
 * They must NOT share the 80G series: a membership fee is not a donation and
 * carries no deduction under section 80G, so numbering it as one would misstate
 * the organisation's receipts. The next number is taken from the highest
 * sequence already issued, so deleting a receipt cannot cause a number to be
 * handed out twice.
 */
export const nextFeeReceiptNo = (receipts, date) => {
  const fy = fyLabel(date)
  const issued = (receipts || [])
    .map((r) => String(r?.no || '').match(/^KSO\/MEM\/\d{4}-\d{2}\/(\d+)$/))
    .filter(Boolean)
    .map((m) => Number(m[1]))
  const next = (issued.length ? Math.max(...issued) : 0) + 1
  return `KSO/MEM/${fy}/${String(next).padStart(4, '0')}`
}

/** Donations without a receipt yet — the queue the 80G register works from. */
export const unreceiptedDonations = (vouchers, receipts) => {
  const issued = new Set(receipts.map((r) => r.voucherId).filter(Boolean))
  return posted(vouchers)
    .filter((v) => v.type === 'Receipt')
    .filter((v) => (v.lines || []).some((l) => ['4101', '4102', '4103'].includes(l.account)))
    .filter((v) => !issued.has(v.id))
    .sort((a, b) => b.date.localeCompare(a.date))
}

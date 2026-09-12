/**
 * Pure calculation helpers for the finance + membership dashboards.
 * No React, no store — easy to unit-test and reuse on the public site.
 */

import {
  format, parseISO, differenceInCalendarDays, differenceInCalendarMonths,
  startOfMonth, subMonths, endOfMonth,
} from 'date-fns'

/* ------------------------------- periods ------------------------------- */
export const PERIODS = [
  { id: 'month', label: 'This month' },
  { id: 'quarter', label: 'Last 3 months' },
  { id: 'half', label: 'Last 6 months' },
  { id: 'ytd', label: 'Year to date' },
  { id: 'fy', label: 'Financial year' },
  { id: 'all', label: 'All time' },
]

export function periodRange(id = 'half', now = new Date()) {
  const to = endOfMonth(now)
  switch (id) {
    case 'month':
      return { from: startOfMonth(now), to, label: 'This month' }
    case 'quarter':
      return { from: startOfMonth(subMonths(now, 2)), to, label: 'Last 3 months' }
    case 'half':
      return { from: startOfMonth(subMonths(now, 5)), to, label: 'Last 6 months' }
    case 'ytd':
      return { from: new Date(now.getFullYear(), 0, 1), to, label: 'Year to date' }
    case 'fy': {
      // Indian financial year: 1 April – 31 March
      const start = now.getMonth() >= 3 ? new Date(now.getFullYear(), 3, 1) : new Date(now.getFullYear() - 1, 3, 1)
      return { from: start, to, label: 'Financial year' }
    }
    default:
      return { from: new Date(2000, 0, 1), to, label: 'All time' }
  }
}

/* ------------------------------ filtering ------------------------------ */
/**
 * The window immediately before `range`, of the SAME length.
 * Comparing six months against a full twelve would make every "vs previous
 * period" percentage meaningless, and "all time" has no previous period at all.
 */
export function previousPeriod({ from, to }, period = '') {
  if (period === 'all') return null
  const months = Math.max(1, differenceInCalendarMonths(to, from) + 1)
  return { from: startOfMonth(subMonths(from, months)), to: endOfMonth(subMonths(from, 1)) }
}

export const inPeriod = (txns, { from, to }) =>
  txns.filter((t) => {
    const d = parseISO(t.date)
    return d >= from && d <= to
  })

export const sumBy = (rows, key = 'amount') => rows.reduce((a, r) => a + Number(r[key] || 0), 0)

/* ------------------------------- series -------------------------------- */
/** Monthly income / expense / net / cumulative series for the last `months` months. */
export function monthlySeries(txns, months = 6, now = new Date()) {
  const buckets = []
  for (let i = months - 1; i >= 0; i--) {
    const d = subMonths(startOfMonth(now), i)
    buckets.push({ key: format(d, 'yyyy-MM'), month: format(d, 'MMM'), income: 0, expense: 0, from: d })
  }
  let cumulative = 0
  const before = startOfMonth(subMonths(now, months - 1))
  cumulative += sumBy(txns.filter((t) => parseISO(t.date) < before && t.type === 'income'))
  cumulative -= sumBy(txns.filter((t) => parseISO(t.date) < before && t.type === 'expense'))

  for (const t of txns) {
    const key = format(parseISO(t.date), 'yyyy-MM')
    const bucket = buckets.find((b) => b.key === key)
    if (!bucket) continue
    if (t.type === 'income') bucket.income += Number(t.amount || 0)
    else bucket.expense += Number(t.amount || 0)
  }
  return buckets.map((b) => {
    cumulative += b.income - b.expense
    return { ...b, net: b.income - b.expense, cumulative, label: b.month }
  })
}

export function categoryBreakdown(txns, type = 'expense') {
  const map = new Map()
  for (const t of txns.filter((x) => x.type === type)) {
    map.set(t.category, (map.get(t.category) || 0) + Number(t.amount || 0))
  }
  return [...map.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
}

export function programTotals(txns, programs = []) {
  const map = new Map()
  for (const t of txns) {
    const key = t.program || 'unallocated'
    if (!map.has(key)) map.set(key, { program: key, income: 0, expense: 0 })
    const row = map.get(key)
    if (t.type === 'income') row.income += Number(t.amount || 0)
    else row.expense += Number(t.amount || 0)
  }
  return [...map.values()].map((r) => {
    const meta = programs.find((p) => p.slug === r.program)
    return { ...r, label: meta?.title || (r.program === 'unallocated' ? 'Unallocated' : r.program), net: r.income - r.expense }
  })
}

/** Indian financial year label for a date: 2026-09-12 → "2026-27". */
export const fyLabelOf = (date = new Date()) => {
  const d = date instanceof Date ? date : parseISO(String(date))
  const y = d.getFullYear()
  const start = d.getMonth() >= 3 ? y : y - 1
  return `${start}-${String((start + 1) % 100).padStart(2, '0')}`
}

/** The financial year currently in progress. */
export const currentFy = () => fyLabelOf(new Date())

/** 1 April → 31 March window for a label like "2026-27", as ISO date strings. */
export const fyWindow = (label) => {
  const start = Number(String(label).split('-')[0])
  if (!start) return null
  return { from: `${start}-04-01`, to: `${start + 1}-03-31` }
}

/** Labels for a picker: last three financial years, newest first. */
export const fyOptions = (count = 3) => {
  const now = new Date()
  const start = (now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1)
  return Array.from({ length: count }, (_, i) => {
    const y = start - i
    return `${y}-${String((y + 1) % 100).padStart(2, '0')}`
  })
}

/**
 * Budget vs actual for a FINANCIAL year, so it can be read next to the
 * Income & Expenditure account and the Balance Sheet, which are both Apr–Mar.
 * Legacy budgets stored with a calendar `year` are still understood.
 */
export function budgetVsActual(txns, budgets, fy, programs = []) {
  const window = fyWindow(fy)
  const wanted = String(fy)
  return budgets
    .filter((b) => String(b.fy || `${b.year}-${String((Number(b.year) + 1) % 100).padStart(2, '0')}`) === wanted)
    .map((b) => {
      const inFy = (t) => {
        const d = String(t.date || '')
        return window ? d >= window.from && d <= window.to : d.startsWith(String(fy).split('-')[0])
      }
      const spent = sumBy(txns.filter((t) => t.type === 'expense' && t.program === b.program && inFy(t)))
      const meta = programs.find((p) => p.slug === b.program)
      return {
        program: b.program,
        label: meta?.title || b.program,
        budget: Number(b.amount || 0),
        actual: spent,
        pct: b.amount ? Math.round((spent / Number(b.amount)) * 100) : 0,
      }
    })
}

/* -------------------------------- members ------------------------------ */
export const daysUntil = (dateStr) => (dateStr ? differenceInCalendarDays(parseISO(dateStr), new Date()) : null)

/** Renewal urgency bucket for a membership row. */
export function renewalState(m) {
  if (!m.renewsOn) return { label: 'No date', tone: 'slate' }
  const d = daysUntil(m.renewsOn)
  if (d < 0) return { label: `Expired ${Math.abs(d)}d ago`, tone: 'red', days: d }
  if (d <= 30) return { label: `Renews in ${d}d`, tone: 'amber', days: d }
  if (d <= 90) return { label: `Renews in ${d}d`, tone: 'brand', days: d }
  return { label: `Renews in ${d}d`, tone: 'slate', days: d }
}

/** Total contributed per member, from linked transactions. */
/**
 * Totals per member. Rows are attributed by `memberId` first; income with no
 * member link (website donations, cash collected at an event) falls back to an
 * exact, case-insensitive match on the party name — pass `members` to enable it.
 * Only rows without a memberId fall back, so nothing is counted twice.
 */
export function memberTotals(txns, members = []) {
  const map = new Map()
  const bump = (id, t) => {
    const row = map.get(id) || { given: 0, count: 0, last: null }
    row.given += Number(t.amount || 0)
    row.count += 1
    if (!row.last || t.date > row.last) row.last = t.date
    map.set(id, row)
  }

  for (const t of txns.filter((x) => x.type === 'income' && x.memberId)) bump(t.memberId, t)

  if (members.length) {
    const byName = new Map()
    for (const m of members) {
      const key = String(m.name || '').trim().toLowerCase()
      if (key && !byName.has(key)) byName.set(key, m.id)
    }
    for (const t of txns.filter((x) => x.type === 'income' && !x.memberId && x.party)) {
      const id = byName.get(String(t.party).trim().toLowerCase())
      if (id) bump(id, t)
    }
  }
  return map
}

/** Cumulative membership growth by month. */
export function membershipGrowth(members, months = 6, now = new Date()) {
  const buckets = []
  for (let i = months - 1; i >= 0; i--) {
    const d = subMonths(startOfMonth(now), i)
    buckets.push({ key: format(d, 'yyyy-MM'), month: format(d, 'MMM'), joined: 0 })
  }
  let total = members.filter((m) => m.joined && parseISO(m.joined) < startOfMonth(subMonths(now, months - 1))).length
  for (const m of members) {
    if (!m.joined) continue
    const key = format(parseISO(m.joined), 'yyyy-MM')
    const b = buckets.find((x) => x.key === key)
    if (b) b.joined += 1
  }
  return buckets.map((b) => {
    total += b.joined
    return { ...b, label: b.month, total }
  })
}

/* --------------------------------- KPIs -------------------------------- */
export function financeKpis(txns, pledges = [], members = []) {
  const income = sumBy(txns.filter((t) => t.type === 'income'))
  const expense = sumBy(txns.filter((t) => t.type === 'expense'))
  const donations = txns.filter((t) => t.type === 'income' && ['Donation', 'Membership fee', 'CSR', 'Grant'].includes(t.category))
  const pending = sumBy(txns.filter((t) => t.status === 'Pending'))
  const pledged = sumBy(pledges.filter((p) => p.status === 'Active'))
  const overheadCategories = ['Utilities', 'Professional fees', 'Bank charges', 'Printing & media', 'Salaries & stipends']
  const overhead = sumBy(txns.filter((t) => t.type === 'expense' && overheadCategories.includes(t.category)))
  return {
    income,
    expense,
    net: income - expense,
    avgDonation: donations.length ? Math.round(sumBy(donations) / donations.length) : 0,
    donationCount: donations.length,
    pending,
    pledged,
    overheadRatio: expense ? Math.round((overhead / expense) * 100) : 0,
    activeMembers: members.filter((m) => m.status === 'Active').length,
    renewalDue: members.filter((m) => {
      const r = renewalState(m)
      return r.tone === 'amber' || r.tone === 'red'
    }).length,
  }
}

/* ------------------------------ formatting ----------------------------- */
const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })
export const money = (n = 0) => inr.format(Number(n) || 0)

export function compactMoney(n = 0) {
  const v = Number(n) || 0
  if (Math.abs(v) >= 1e7) return `₹${(v / 1e7).toFixed(2)} Cr`
  if (Math.abs(v) >= 1e5) return `₹${(v / 1e5).toFixed(2)} L`
  if (Math.abs(v) >= 1e3) return `₹${(v / 1e3).toFixed(1)}K`
  return `₹${v}`
}

export const toCSV = (rows, headers) =>
  [headers, ...rows.map((r) => headers.map((h) => `"${String(r[h] ?? '').replace(/"/g, '""')}"`))]
    .map((r) => r.join(','))
    .join('\n')

/* --------------------------- amount in words ---------------------------- */
/* Indian grouping (lakh / crore), used on receipts and certificates where the
   amount must be spelled out as well as printed. */

const ONES = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine',
  'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen']
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety']
const SCALES = [[1e7, 'crore'], [1e5, 'lakh'], [1e3, 'thousand']]

const under100 = (n) => (n < 20 ? ONES[n] : `${TENS[Math.floor(n / 10)]}${n % 10 ? `-${ONES[n % 10]}` : ''}`)
const under1000 = (n) => {
  const h = Math.floor(n / 100)
  const r = n % 100
  return [h ? `${ONES[h]} hundred` : '', r ? under100(r) : ''].filter(Boolean).join(' ')
}

/** 1584100 → "fifteen lakh eighty-four thousand one hundred" */
const numberToWords = (n) => {
  if (n < 1000) return under1000(n)
  for (const [size, name] of SCALES) {
    if (n >= size) {
      const head = Math.floor(n / size)
      const tail = n % size
      return `${numberToWords(head)} ${name}${tail ? ` ${numberToWords(tail)}` : ''}`
    }
  }
  return ''
}

/**
 * 1584100 → "Rupees fifteen lakh eighty-four thousand one hundred only"
 * 1500.5  → "Rupees one thousand five hundred and fifty paise only"
 */
export function amountInWords(amount = 0, { prefix = 'Rupees', suffix = 'only' } = {}) {
  const n = Math.abs(Number(amount) || 0)
  const rupees = Math.floor(n)
  const paise = Math.round((n - rupees) * 100)
  if (rupees === 0 && paise === 0) return `${prefix} zero ${suffix}`
  const words = rupees ? numberToWords(rupees) : 'zero'
  const paiseWords = paise ? ` and ${numberToWords(paise)} paise` : ''
  return `${prefix} ${words}${paiseWords} ${suffix}`
}

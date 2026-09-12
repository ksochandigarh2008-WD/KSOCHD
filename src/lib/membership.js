/**
 * MEMBERSHIP DOMAIN LOGIC
 *
 * Pure functions only — no React, no store — so every rule below can be
 * exercised directly by the test suites and reused by the public site.
 *
 * Four things live here that were previously scattered, implicit or absent:
 *
 *   1. Member numbers. These used to be `Math.floor(Math.random() * 9000) + 1000`,
 *      which collides: 1000 draws from that range produce ~53 duplicates, and the
 *      range overlaps the seeded KSO-1001…KSO-1012. Numbers are now derived from
 *      the records that exist, so they are unique and monotonic by construction.
 *   2. Tier settings. Tiers and fees were constants in seedData.js; they now live
 *      in settings (defaults still come from seedData.js) so an admin can rename
 *      a tier or reprice it without a code change.
 *   3. Renewal policy. `renew()` in MembershipTab treated every cycle except
 *      "monthly" as annual, so a "one-time" or "no fee" member could be renewed
 *      and charged forever. `isRenewable()` now decides, once, for every caller.
 *   4. Status truth. The stored status and the renewal date are two sources of
 *      truth, so a member could sit at "Active" with the date long past.
 *      `effectiveStatus()` reconciles them and `reconcileStatuses()` reports what
 *      would change, so the fix is reviewable before it is applied.
 */

import { addMonths, addYears, differenceInCalendarDays, isAfter, parseISO } from 'date-fns'
import { FEE_CYCLES, MEMBER_TIERS, TIER_FEES } from '../data/seedData'
import { fyLabelOf, fyWindow } from './finance'

export const MEMBERSHIP_FEE_CATEGORY = 'Membership fee'

/* ---------------------------------------------------------------------- *
 * 1. Member numbers
 * ---------------------------------------------------------------------- */

/** Numbers look like KSO-1001. Anything else is left alone. */
const MEMBER_NO_RE = /^KSO-(\d+)$/
export const MEMBER_NO_FIRST = 1001

/**
 * The next membership number, derived from the records that already exist.
 *
 * Deterministic: the same records always produce the same answer, so two
 * admins adding a member at the same moment cannot both be handed KSO-1013
 * by a random draw. Gaps left by deleted members are not reused unless they
 * are the next number in sequence.
 */
export function nextMemberNo(rows = []) {
  const used = new Set()
  let highest = MEMBER_NO_FIRST - 1

  for (const row of rows || []) {
    const no = String(row?.memberNo ?? '').trim()
    if (!no) continue
    used.add(no)
    const match = no.match(MEMBER_NO_RE)
    if (match) highest = Math.max(highest, Number(match[1]))
  }

  let n = Math.max(highest + 1, MEMBER_NO_FIRST)
  while (used.has(`KSO-${n}`)) n += 1
  return `KSO-${n}`
}

/**
 * A member number that is safe to store: the caller's suggestion if it is
 * present and unused (so an imported roster keeps its own numbering),
 * otherwise the next one in sequence.
 */
export function ensureMemberNo(rows, candidate) {
  const taken = (rows || []).map((r) => String(r?.memberNo ?? '').trim()).filter(Boolean)
  const wanted = String(candidate ?? '').trim()
  if (wanted && !taken.includes(wanted)) return wanted
  return nextMemberNo(rows)
}

/**
 * Rows sharing a membership number, oldest first in each group.
 * Used to surface damage already done by the old random generator.
 */
export function duplicateMemberNos(rows = []) {
  const byNo = new Map()
  for (const row of rows || []) {
    const no = String(row?.memberNo ?? '').trim()
    if (!no) continue
    if (!byNo.has(no)) byNo.set(no, [])
    byNo.get(no).push(row)
  }
  return [...byNo.entries()].filter(([, group]) => group.length > 1).map(([no, group]) => ({ no, rows: group }))
}

/* ---------------------------------------------------------------------- *
 * 2. Tiers & fees (settings-backed, seeded from the constants)
 * ---------------------------------------------------------------------- */

const CYCLES = new Set(FEE_CYCLES)
const cleanCycle = (c) => (CYCLES.has(c) ? c : 'annual')

/** The shipped tiers — used on first run, and if stored settings are unusable. */
export const defaultMembershipSettings = () => ({
  tiers: MEMBER_TIERS.map((name) => ({ name, fee: Number(TIER_FEES[name]) || 0, cycle: 'annual' })),
})

/**
 * Read membership settings defensively. Stored tiers that are blank or the
 * wrong shape are dropped rather than breaking every dropdown; if nothing
 * survives, the defaults are used. A store with no `membership` key at all
 * (every store written before this feature) is therefore valid.
 */
export function membershipOf(settings) {
  const stored = settings?.membership
  const tiers = Array.isArray(stored?.tiers)
    ? stored.tiers
      .map((t) => ({
        name: String(t?.name ?? '').trim(),
        fee: Math.max(0, Number(t?.fee) || 0),
        cycle: cleanCycle(t?.cycle),
      }))
      .filter((t) => t.name)
    : []
  return { tiers: tiers.length ? tiers : defaultMembershipSettings().tiers }
}

export const tierNames = (settings) => membershipOf(settings).tiers.map((t) => t.name)

export const tierOf = (settings, name) =>
  membershipOf(settings).tiers.find((t) => t.name === String(name ?? '').trim()) || null

/** The fee for a tier, or 0 if the tier is unknown (never NaN). */
export const tierFee = (settings, name) => Number(tierOf(settings, name)?.fee) || 0

/** Dropdown options, e.g. "Family — ₹1,000/yr". */
export function tierOptions(settings) {
  return membershipOf(settings).tiers.map((t) => ({
    value: t.name,
    label: `${t.name} — ₹${t.fee.toLocaleString('en-IN')}${t.cycle === 'monthly' ? '/mo' : t.cycle === 'annual' ? '/yr' : ''}`,
  }))
}

/**
 * Tiers that members are currently sitting on — removing one of these would
 * orphan those records, so the UI warns instead of cascading a change.
 */
export const tiersInUse = (members = []) =>
  [...new Set((members || []).map((m) => String(m?.tier ?? '').trim()).filter(Boolean))]

/* ---------------------------------------------------------------------- *
 * 3. Renewal policy
 * ---------------------------------------------------------------------- */

/** Only these cycles roll forward. One-time and no-fee memberships do not. */
export const RENEWABLE_CYCLES = ['monthly', 'annual']
export const isRenewable = (cycle) => RENEWABLE_CYCLES.includes(String(cycle ?? ''))

export const cycleLabel = (cycle) =>
  ({ monthly: 'monthly', annual: 'annual', 'one-time': 'one-time — does not renew', none: 'no fee — does not renew' }[cycle] || 'annual')

/**
 * The date a renewal moves the membership to, or null when the cycle does not
 * renew. Monthly and annual behave exactly as before (roll forward from the
 * existing date when it is still in the future, otherwise from today); the
 * other two cycles deliberately return null so nothing is silently charged.
 */
export function nextRenewalDate(member, now = new Date()) {
  if (!isRenewable(member?.feeCycle)) return null
  const parsed = member?.renewsOn ? parseISO(member.renewsOn) : null
  const valid = parsed && !Number.isNaN(parsed.valueOf())
  const base = valid && isAfter(parsed, now) ? parsed : now
  const next = member.feeCycle === 'monthly' ? addMonths(base, 1) : addYears(base, 1)
  return next.toISOString().slice(0, 10)
}

/* ---------------------------------------------------------------------- *
 * 4. Status truth
 * ---------------------------------------------------------------------- */

/**
 * Statuses an admin sets deliberately. These always win: a suspended member
 * does not become "Active" because their renewal date happens to be far off.
 */
export const OVERRIDE_STATUSES = ['Suspended', 'Inactive', 'Pending']

/** Days from `now` to the renewal date; null when there is nothing to measure. */
export function daysToRenewal(member, now = new Date()) {
  if (!member?.renewsOn) return null
  const parsed = parseISO(String(member.renewsOn))
  if (Number.isNaN(parsed.valueOf())) return null
  return differenceInCalendarDays(parsed, now)
}

/**
 * The status a member should have, given today's date.
 *
 * Returns `stored` untouched for administrative overrides and for members with
 * no renewal date — there is nothing to reconcile in either case.
 */
export function effectiveStatus(member, now = new Date()) {
  const stored = String(member?.status ?? '')
  const unchanged = (status = stored) => ({ status, stored, derived: false, changed: false, days: null })

  if (!stored) return unchanged('')
  if (OVERRIDE_STATUSES.includes(stored)) return unchanged()
  const days = daysToRenewal(member, now)
  if (days == null) return unchanged()

  const derived = days < 0 ? 'Expired' : days <= 30 ? 'Renewal due' : 'Active'
  return { status: derived, stored, derived: true, changed: derived !== stored, days }
}

/** Every member whose stored status disagrees with their renewal date. */
export const reconcileStatuses = (members = [], now = new Date()) =>
  (members || [])
    .map((m) => ({ id: m.id, name: m.name, memberNo: m.memberNo, from: String(m.status ?? ''), ...effectiveStatus(m, now) }))
    .filter((r) => r.changed)

/* ---------------------------------------------------------------------- *
 * 5. Dues
 * ---------------------------------------------------------------------- */

/**
 * Does this transaction belong to this member?
 * `memberId` is authoritative; a name match is the fallback for money that
 * arrived without a link (cash at a camp, a bank transfer typed in later).
 */
export function txnBelongsTo(txn, member) {
  if (!txn || !member) return false
  if (txn.memberId && member.id) return txn.memberId === member.id
  const a = String(txn.party ?? '').trim().toLowerCase()
  const b = String(member.name ?? '').trim().toLowerCase()
  return Boolean(a) && a === b
}

const feeTransactions = (transactions, member) =>
  (transactions || []).filter(
    (t) => t.type === 'income' && t.category === MEMBERSHIP_FEE_CATEGORY && txnBelongsTo(t, member),
  )

/**
 * What a membership should have paid this financial year, and what it has.
 *
 * Cycle semantics, stated once so the ledger and the directory agree:
 *   annual    — one fee per financial year
 *   monthly   — twelve fees per financial year
 *   one-time  — one fee, ever (so an old payment still counts as settled)
 *   none      — nothing is owed (honorary / life members)
 */
export function membershipDues(members = [], transactions = [], settings, fy = fyLabelOf(new Date())) {
  const window = fyWindow(fy) || { from: '0000-01-01', to: '9999-12-31' }

  return (members || []).map((m) => {
    const cycle = m.feeCycle || 'annual'
    // A member's own fee wins — a member who joined at ₹500 stays at ₹500 after a
    // repricing. Falling back to the tier keeps legacy rows with no fee usable.
    const fee = Math.max(0, Number(m.feeAmount) || tierFee(settings, m.tier))

    if (cycle === 'none') {
      return { id: m.id, memberNo: m.memberNo, name: m.name, cycle, fee, fy, expected: 0, paid: 0, due: 0, status: 'n/a' }
    }

    const expected = cycle === 'monthly' ? fee * 12 : fee
    // One-time fees are settled for good, so the whole history counts.
    // Everything else is measured inside the financial year.
    const rows = feeTransactions(transactions, m).filter(
      (t) => cycle === 'one-time' || (t.date >= window.from && t.date <= window.to),
    )
    const received = rows.reduce((a, t) => a + Number(t.amount || 0), 0)
    const due = Math.max(0, expected - received)

    return {
      id: m.id,
      memberNo: m.memberNo,
      name: m.name,
      cycle,
      fee,
      fy,
      expected,
      paid: received,
      due,
      status: expected === 0 ? 'n/a' : due === 0 ? 'paid' : received > 0 ? 'partial' : 'unpaid',
    }
  })
}

/** Totals across a dues list, for the KPI cards. */
export const duesSummary = (dues = []) => ({
  expected: dues.reduce((a, d) => a + Number(d.expected || 0), 0),
  collected: dues.reduce((a, d) => a + Number(d.paid || 0), 0),
  outstanding: dues.reduce((a, d) => a + Number(d.due || 0), 0),
  paidCount: dues.filter((d) => d.status === 'paid').length,
  unpaidCount: dues.filter((d) => d.status === 'unpaid' || d.status === 'partial').length,
})

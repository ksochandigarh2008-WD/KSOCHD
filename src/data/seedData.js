/**
 * Seed + reference data for the membership and finance systems.
 * Demo rows are tagged `demo: true` so they can be cleared in one click.
 *
 * Dates are generated relative to "today" so charts always look alive.
 */

import { v4 as uuidv4 } from 'uuid'
import { fundForCategory } from './accounts'
import { fyLabelOf } from '../lib/finance'
import { subDays, subMonths, addYears, addMonths, format, startOfMonth } from 'date-fns'

const iso = (d) => format(d, 'yyyy-MM-dd')

/* ------------------------------------------------------------------ *
 * Reference lists
 * ------------------------------------------------------------------ */
export const MEMBER_TYPES = ['Volunteer', 'Member', 'Donor', 'Patron', 'Board', 'Staff', 'Honorary']
export const MEMBER_TIERS = ['Individual', 'Family']
export const MEMBER_STATUSES = ['Active', 'Pending', 'Renewal due', 'Expired', 'Suspended', 'Inactive']
export const FEE_CYCLES = ['annual', 'monthly', 'one-time', 'none']
export const CENTRES = [
  'Sector 00 — Main', 'Sector 22 — Learning', 'Mohali — Phase 3', 'Panchkula — Sector 12',
  'Central office', 'Field — relief', 'Remote',
]

export const INCOME_CATEGORIES = ['Donation', 'Membership fee', 'Grant', 'CSR', 'Event income', 'In-kind', 'Other income']
export const EXPENSE_CATEGORIES = [
  'Program expense', 'Salaries & stipends', 'Medicines & supplies', 'Venue & logistics',
  'Utilities', 'Travel', 'Printing & media', 'Professional fees', 'Bank charges', 'Other expense',
]
export const ALL_CATEGORIES = [...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES]
export const PAYMENT_METHODS = ['UPI', 'Card', 'Cash', 'Bank transfer', 'Cheque', 'In-kind', 'Gateway']
export const TXN_STATUS = ['Cleared', 'Pending', 'Reconciled', 'Rejected']
export const PLEDGE_FREQUENCIES = ['monthly', 'quarterly', 'annual', 'one-time']

/** Annual fee by tier (₹) — used for renewals and projections. */
export const TIER_FEES = { Individual: 500, Family: 1000 }

/** Relationship options for people covered by a Family membership. */
export const HOUSEHOLD_RELATIONS = ['Spouse', 'Child', 'Parent', 'Sibling', 'Other']

/** Legacy tiers removed in v3 — kept only so stored data can be migrated forward. */
export const LEGACY_TIER_FEES = { Basic: 500, Supporting: 2500, Patron: 10000, Lifetime: 50000, Corporate: 25000 }
export const migrateTier = (t) => (t === 'Individual' || t === 'Basic' ? 'Individual' : 'Family')

/* ------------------------------------------------------------------ *
 * Seed: memberships
 * ------------------------------------------------------------------ */
export const seedMemberships = () => {
  const now = new Date()
  // name, type, tier, status, renewOffset, tenureMonths, centre, skills, household
  const rows = [
    ['Harpreet Singh', 'Volunteer', 'Individual', 'Active', 0, 8, 'Sector 00 — Main', 'Teaching / mentoring', []],
    ['Simran Kaur', 'Member', 'Family', 'Active', -14, 3, 'Mohali — Phase 3', 'Health camp support', [['Rajinder Singh', 'Spouse'], ['Aarav Singh', 'Child']]],
    ['Rakesh Sharma', 'Donor', 'Individual', 'Active', 40, 9, 'Central office', 'Monthly donor since 2021', []],
    ['Anita Verma', 'Volunteer', 'Family', 'Renewal due', 12, 5, 'Sector 22 — Learning', 'Field surveys', [['Sanjay Verma', 'Spouse'], ['Nisha Verma', 'Child']]],
    ['Mohammed Iqbal', 'Member', 'Individual', 'Active', 120, 22, 'Panchkula — Sector 12', 'Event & logistics', []],
    ['Priya Menon', 'Board', 'Family', 'Active', 300, 30, 'Central office', 'Treasurer', [['Rahul Menon', 'Spouse'], ['Ishaan Menon', 'Child'], ['Diya Menon', 'Child']]],
    ['Jaswinder Gill', 'Volunteer', 'Individual', 'Pending', 0, 1, 'Field — relief', 'Relief distribution', []],
    ['Neha Arora', 'Staff', 'Individual', 'Active', 200, 18, 'Central office', 'Programme coordinator', []],
    ['Tarun Joshi', 'Donor', 'Individual', 'Expired', -60, 12, 'Remote', 'Occasional donor', []],
    ['Sunita Devi', 'Volunteer', 'Family', 'Active', 45, 6, 'Sector 00 — Main', 'Spoken English mentor', [['Ramesh Kumar', 'Spouse'], ['Pooja Kumar', 'Child']]],
    ['Vikram Malhotra', 'Patron', 'Family', 'Active', 150, 20, 'Central office', 'CSR connect', [['Meera Malhotra', 'Spouse'], ['Kabir Malhotra', 'Child']]],
    ['Kavita Rao', 'Member', 'Individual', 'Suspended', 80, 4, 'Remote', 'Paused for a year', []],
  ]
  return rows.map(([name, type, tier, status, renewOffset, tenureMonths, centre, skills, household], i) => ({
    id: uuidv4(),
    memberNo: `KSO-${String(1001 + i)}`,
    name,
    email: `${name.split(' ')[0].toLowerCase()}@example.org`,
    phone: `98${String(76_000_000 + i * 12345).slice(0, 8)}`,
    type,
    tier,
    status,
    joined: iso(subMonths(now, tenureMonths)),
    renewsOn: iso(addMonths(now, renewOffset)),
    centre,
    skills,
    feeAmount: TIER_FEES[tier] || 0,
    feeCycle: 'annual',
    household: household.map(([hn, relation]) => ({ name: hn, relation })),
    address: '',
    city: centre.includes('Mohali') ? 'Mohali' : centre.includes('Panchkula') ? 'Panchkula' : 'Chandigarh',
    notes: '',
    avatar: '',
    eventsAttended: (i * 7) % 23,
    createdAt: iso(subMonths(now, tenureMonths)),
    demo: true,
  }))
}

/* ------------------------------------------------------------------ *
 * Seed: transactions (last 6 months)
 * ------------------------------------------------------------------ */
export const seedTransactions = () => {
  const now = new Date()
  const out = []

  const incomeTemplates = [
    ['Rakesh Sharma', 'Donation', 25000, 'UPI', 'Monthly giving'],
    ['Anonymous donor', 'Donation', 5000, 'UPI', 'Website donation'],
    ['Netsmart Foundation', 'CSR', 250000, 'Bank transfer', 'CSR grant — school adoption'],
    ['Tricity Marathon entries', 'Event income', 184000, 'Gateway', 'Marathon 2026 registrations'],
    ['Simran Kaur', 'Membership fee', 1000, 'UPI', 'Family membership renewal'],
    ['Mohammed Iqbal', 'Membership fee', 500, 'Cash', 'Individual membership renewal'],
    ['Vikram Malhotra', 'Donation', 100000, 'Bank transfer', 'Patron contribution'],
    ['Rotary Club Chandigarh', 'Grant', 150000, 'Cheque', 'Health camp equipment'],
    ['Local pharmacy', 'In-kind', 22000, 'In-kind', 'Medicines donated'],
    ['Priya Menon', 'Donation', 50000, 'Bank transfer', 'Family membership top-up'],
    ['Helmsley Charitable Trust', 'Grant', 250000, 'Bank transfer', 'FCRA — livelihood training centre', 'FCRA'],
  ]

  const expenseTemplates = [
    ['Tutor stipends — September', 'Salaries & stipends', 96000, 'Bank transfer', '14 learning centres'],
    ['Camp medicines', 'Medicines & supplies', 42000, 'Bank transfer', 'Arogya monthly'],
    ['Marathon venue & permissions', 'Venue & logistics', 78000, 'Bank transfer', 'Sukhna Lake'],
    ['Learning centre supplies', 'Program expense', 34000, 'Cash', 'Stationery, mats, charts'],
    ['Office rent & electricity', 'Utilities', 18500, 'Bank transfer', 'Central office'],
    ['Printing — annual report', 'Printing & media', 26000, 'Bank transfer', '500 copies'],
    ['Field travel reimbursement', 'Travel', 9400, 'Cash', 'Volunteer conveyance'],
    ['Audit & compliance fees', 'Professional fees', 45000, 'Bank transfer', 'Statutory audit'],
    ['Winter kit material', 'Program expense', 128000, 'Bank transfer', '3,000 kits'],
    ['Payment gateway charges', 'Bank charges', 3800, 'Gateway', 'Platform fee'],
    ['Livelihood centre equipment', 'Program expense', 86000, 'Bank transfer', 'FCRA — training centre fit-out', 'FCRA'],
  ]

  const programs = ['education', 'health', 'livelihood', 'community']

  for (let m = 5; m >= 0; m--) {
    const monthStart = startOfMonth(subMonths(now, m))
    const jitter = (i) => Math.min(27, 3 + ((i * 7 + m * 5) % 24))
    const pick = (arr, i) => arr[(i + m) % arr.length]

    for (let i = 0; i < 5; i++) {
      const [donor, category, base, method, note, fund] = pick(incomeTemplates, i)
      const amount = Math.round((base * (0.7 + ((i + m) % 5) * 0.13)) / 100) * 100
      out.push({
        id: uuidv4(),
        date: iso(subDays(monthStart, -jitter(i))),
        type: 'income',
        category,
        amount,
        program: programs[(i + m) % programs.length],
        party: donor,
        method,
        reference: `REF${String(m)}${String(i).padStart(2, '0')}`,
        status: m === 0 && i > 3 ? 'Pending' : 'Cleared',
        note,
        memberId: null,
        fund: fund || fundForCategory(category),
        demo: true,
      })
    }
    for (let i = 0; i < 4; i++) {
      const [vendor, category, base, method, note, fund] = pick(expenseTemplates, i)
      const amount = Math.round((base * (0.8 + ((i + m) % 4) * 0.12)) / 100) * 100
      out.push({
        id: uuidv4(),
        date: iso(subDays(monthStart, -jitter(i + 3))),
        type: 'expense',
        category,
        amount,
        program: programs[(i + m + 1) % programs.length],
        party: vendor,
        method,
        reference: `EXP${String(m)}${String(i).padStart(2, '0')}`,
        status: m === 0 && i > 2 ? 'Pending' : 'Cleared',
        note,
        memberId: null,
        fund: fund || 'Unrestricted',
        demo: true,
      })
    }
  }

  // Foreign contribution (FCRA) is tracked separately from the first rupee,
  // so these rows carry their own fund tag and land in the FCRA register.
  const fcraIncome = [
    ['Helmsley Charitable Trust', 250_000, 5, 'FCRA/2025/1142'],
    ['Helmsley Charitable Trust', 180_000, 3, 'FCRA/2026/0087'],
    ['Giving Wheels International', 90_000, 1, 'FCRA/2026/0311'],
  ]
  for (const [party, amount, monthsAgo, reference] of fcraIncome) {
    out.push({
      id: uuidv4(),
      date: iso(subDays(startOfMonth(subMonths(now, monthsAgo)), -11)),
      type: 'income', category: 'Grant', amount, program: 'livelihood',
      party, method: 'Bank transfer', reference, status: 'Cleared',
      note: 'Foreign contribution — livelihood training centre',
      memberId: null, fund: 'FCRA', demo: true,
    })
  }
  const fcraExpense = [
    ['Livelihood centre equipment', 86_000, 4, 'Training centre fit-out'],
    ['Livelihood stipends', 42_000, 2, 'Trainee support, 6 batches'],
  ]
  for (const [party, amount, monthsAgo, note] of fcraExpense) {
    out.push({
      id: uuidv4(),
      date: iso(subDays(startOfMonth(subMonths(now, monthsAgo)), -17)),
      type: 'expense', category: 'Program expense', amount, program: 'livelihood',
      party, method: 'Bank transfer', reference: '', status: 'Cleared',
      note, memberId: null, fund: 'FCRA', demo: true,
    })
  }

  return out.sort((a, b) => (a.date < b.date ? 1 : -1))
}

/* ------------------------------------------------------------------ *
 * Seed: pledges (recurring commitments)
 * ------------------------------------------------------------------ */
export const seedPledges = () => {
  const now = new Date()
  const rows = [
    ['Rakesh Sharma', 25000, 'monthly'],
    ['Vikram Malhotra', 100000, 'annual'],
    ['Netsmart Foundation', 500000, 'quarterly'],
    ['Simran Kaur', 2500, 'monthly'],
    ['Rotary Club Chandigarh', 150000, 'annual'],
  ]
  return rows.map(([name, amount, frequency], i) => ({
    id: uuidv4(),
    name,
    amount,
    frequency,
    startDate: iso(subMonths(now, 6 - i)),
    nextDue: iso(addMonths(subMonths(now, 6 - i), frequency === 'monthly' ? 7 : frequency === 'quarterly' ? 9 : 12)),
    program: ['education', 'health', 'livelihood', 'community'][i % 4],
    status: 'Active',
    note: '',
    demo: true,
  }))
}

/* ------------------------------------------------------------------ *
 * Seed: budgets
 * ------------------------------------------------------------------ */
export const seedBudgets = () => {
  const fy = fyLabelOf(new Date())
  return [
    { id: uuidv4(), program: 'education', fy, amount: 1800000, demo: true },
    { id: uuidv4(), program: 'health', fy, amount: 1200000, demo: true },
    { id: uuidv4(), program: 'livelihood', fy, amount: 900000, demo: true },
    { id: uuidv4(), program: 'community', fy, amount: 750000, demo: true },
  ]
}

export const addPeriod = (dateStr, cycle = 'annual') => {
  const base = dateStr ? new Date(dateStr) : new Date()
  return iso(cycle === 'monthly' ? addMonths(base, 1) : addYears(base, 1))
}

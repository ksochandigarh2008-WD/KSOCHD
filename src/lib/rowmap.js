/**
 * ROW MAPPING between the app's camelCase rows and the snake_case Postgres
 * columns in DEPLOY.md.
 *
 * Why this exists: the local store, the REST client and the React Query hooks all
 * speak camelCase (`renewsOn`, `feeAmount`). Postgres speaks snake_case
 * (`renews_on`, `fee_amount`). Nothing translated between them, so with Supabase
 * configured the app read `renews_on` and looked for `renewsOn` — every member
 * showed "No date", no number and ₹0 fee. Writes were worse: an insert carrying
 * `memberNo` against a `member_no` column errors, and one carrying `demo` — a
 * key every seeded row has — fails because no such column exists.
 *
 * So `toRow` FILTERS to known columns as well as renaming them. Dropping unknown
 * keys is deliberate: it is what keeps a local-only field like `demo` from
 * breaking a real database write.
 *
 * The map is app key → database column. `fromRow` inverts it. The test suite
 * parses the DDL out of DEPLOY.md and asserts these two agree, so the schema and
 * this file cannot drift apart again.
 */

export const ROW_COLUMNS = {
  /* kind (store key) → { appKey: 'db_column' } */
  memberships: {
    id: 'id', createdAt: 'created_at', memberNo: 'member_no', name: 'name', email: 'email',
    phone: 'phone', type: 'type', tier: 'tier', status: 'status', centre: 'centre', city: 'city',
    address: 'address', joined: 'joined', renewsOn: 'renews_on', skills: 'skills', notes: 'notes',
    avatar: 'avatar', feeAmount: 'fee_amount', feeCycle: 'fee_cycle',
    eventsAttended: 'events_attended', household: 'household',
  },
  transactions: {
    id: 'id', createdAt: 'created_at', date: 'date', type: 'type', category: 'category',
    amount: 'amount', program: 'program', party: 'party', method: 'method', reference: 'reference',
    status: 'status', note: 'note', memberId: 'member_id', fund: 'fund',
  },
  pledges: {
    id: 'id', createdAt: 'created_at', name: 'name', amount: 'amount', frequency: 'frequency',
    startDate: 'start_date', nextDue: 'next_due', program: 'program', status: 'status', note: 'note',
  },
  // `fy` is the current key ("2026-27"). `year` is kept because budgets written
  // before the financial-year switch still carry a calendar year, and
  // finance.js budgetVsActual() understands both.
  budgets: {
    id: 'id', createdAt: 'created_at', program: 'program', fy: 'fy', year: 'year', amount: 'amount',
  },
  accounts: {
    id: 'id', code: 'code', name: 'name', group: 'group', subGroup: 'sub_group',
    opening: 'opening', openingType: 'opening_type', note: 'note', active: 'active', system: 'system',
  },
  grants: {
    id: 'id', donor: 'donor', purpose: 'purpose', sanctionNo: 'sanction_no',
    sanctioned: 'sanctioned', received: 'received', startDate: 'start_date', endDate: 'end_date',
    program: 'program', fund: 'fund', status: 'status',
  },
  receipts: {
    id: 'id', no: 'no', date: 'date', voucherId: 'voucher_id', donor: 'donor', amount: 'amount',
    method: 'method', pan: 'pan', address: 'address', narration: 'narration',
  },
  feeReceipts: {
    id: 'id', createdAt: 'created_at', no: 'no', date: 'date', kind: 'kind', memberId: 'member_id',
    memberNo: 'member_no', memberName: 'member_name', tier: 'tier', cycle: 'cycle',
    period: 'period', amount: 'amount', method: 'method',
  },
  vouchers: {
    id: 'id', createdAt: 'created_at', no: 'no', date: 'date', type: 'type', party: 'party',
    method: 'method', reference: 'reference', narration: 'narration', program: 'program',
    fund: 'fund', amount: 'amount', status: 'status', lines: 'lines', source: 'source',
    sourceId: 'source_id', grantId: 'grant_id', memberId: 'member_id',
  },
}

/** db_column → appKey, derived once per resource. */
const INVERSE = Object.fromEntries(
  Object.entries(ROW_COLUMNS).map(([kind, map]) => [
    kind,
    Object.fromEntries(Object.entries(map).map(([app, db]) => [db, app])),
  ]),
)

/** Unknown resources pass through untouched, so adding one is never a crash. */
const mapFor = (kind) => ROW_COLUMNS[kind] || null

/**
 * App row → database row. Renames to snake_case and DROPS keys with no column,
 * which is what stops a local-only field (`demo`) from failing a real insert.
 * A key already in snake_case is accepted, so re-saving a row that came from the
 * database round-trips cleanly.
 */
export function toRow(kind, row) {
  const map = mapFor(kind)
  if (!map || !row) return row
  const out = {}
  for (const [app, db] of Object.entries(map)) {
    if (row[app] !== undefined) out[db] = row[app]
    else if (row[db] !== undefined) out[db] = row[db]
  }
  return out
}

/** Database row → app row, so every caller above the data layer keeps camelCase. */
export function fromRow(kind, row) {
  const inverse = INVERSE[kind]
  if (!inverse || !row) return row
  const out = {}
  for (const [db, app] of Object.entries(inverse)) {
    if (row[db] !== undefined) out[app] = row[db]
  }
  return out
}

export const toRows = (kind, rows) => (Array.isArray(rows) ? rows.map((r) => toRow(kind, r)) : rows)
export const fromRows = (kind, rows) => (Array.isArray(rows) ? rows.map((r) => fromRow(kind, r)) : rows)

/**
 * Keys on a row that have no database column, i.e. what toRow would silently
 * drop. Exported so a caller (or a test) can inspect the loss rather than
 * discovering it in production.
 */
export function unsupportedKeys(kind, row) {
  const map = mapFor(kind)
  if (!map || !row) return []
  const known = new Set(Object.values(map))
  return Object.keys(row).filter((k) => !(k in map) && !known.has(k))
}

/** The column list for a resource — what the DDL should declare, and no more. */
export const columnsFor = (kind) => Object.values(mapFor(kind) || {})

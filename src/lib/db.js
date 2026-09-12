/**
 * ASYNC DATA LAYER for the membership + finance systems.
 *
 * Three backends, one interface — the React Query hooks never know which is live:
 *
 *   1. Supabase — set VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY. Schema in DEPLOY.md.
 *   2. REST     — set VITE_API_BASE_URL and calls go to your own API (src/api/client.js).
 *   3. Local    — default. Reads/writes the Zustand store, persisted to localStorage.
 *                 Tiny artificial latency keeps loading states honest.
 *
 * Precedence is Supabase → REST → local, and any failure falls through to local,
 * so the admin never breaks because a backend is down.
 */

import { v4 as uuidv4 } from 'uuid'
import { supabase, isSupabase, TABLES } from './supabase'
import { api, isApiMode } from '../api/client'
import { useSite } from '../store/useSite'
import { ensureMemberNo } from './membership'

const LATENCY = 90
const wait = (ms = LATENCY) => new Promise((r) => setTimeout(r, ms))
const store = () => useSite.getState()

/** Surface real Supabase errors rather than swallowing them. */
const unwrap = ({ data, error }) => {
  if (error) throw new Error(error.message)
  return data
}

/** Map an admin resource onto its REST endpoint (see src/api/client.js). */
const restFor = {
  memberships: 'members', transactions: 'transactions', pledges: 'pledges', budgets: 'budgets',
  accounts: 'accounts', vouchers: 'vouchers', grants: 'grants', receipts: 'receipts',
  feeReceipts: 'feeReceipts',
}

/**
 * Assign a membership number before the row leaves the client, so the guarantee
 * holds on every backend. This is the only place all three paths pass through:
 * Supabase inserts, REST calls and the local store all originate here. Numbers
 * are derived from the records already present, never drawn at random.
 */
const withMemberNo = (row) => {
  if (String(row?.memberNo ?? '').trim()) {
    const taken = (store().memberships || []).map((m) => String(m?.memberNo ?? '').trim())
    if (!taken.includes(String(row.memberNo).trim())) return row
  }
  return { ...row, memberNo: ensureMemberNo(store().memberships, row?.memberNo) }
}

function makeResource(kind, table, { prepare } = {}) {
  const rest = api[restFor[kind]]
  return {
    async list() {
      if (isSupabase) {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .order(kind === 'transactions' || kind === 'pledges' || kind === 'vouchers' ? 'date' : 'created_at', { ascending: false })
        return unwrap({ data, error })
      }
      if (isApiMode) {
        const rows = await rest.list()
        if (rows) return rows
      }
      await wait()
      return [...(store()[kind] || [])]
    },

    async create(row) {
      const base = { id: uuidv4(), created_at: new Date().toISOString(), ...row }
      const record = prepare ? prepare(base) : base
      if (isSupabase) {
        const { data, error } = await supabase.from(table).insert(record).select().single()
        return unwrap({ data, error })
      }
      if (isApiMode) {
        const created = await rest.create(record)
        if (created) return created
      }
      await wait()
      store().addRow(kind, record)
      return record
    },

    async update(id, patch) {
      if (isSupabase) {
        const { data, error } = await supabase.from(table).update(patch).eq('id', id).select().single()
        return unwrap({ data, error })
      }
      if (isApiMode) {
        const updated = await rest.update(id, patch)
        if (updated) return updated
      }
      await wait()
      store().updateRow(kind, id, patch)
      return { id, ...patch }
    },

    async remove(id) {
      if (isSupabase) {
        const { error } = await supabase.from(table).delete().eq('id', id)
        if (error) throw new Error(error.message)
        return id
      }
      if (isApiMode) {
        const removed = await rest.remove(id)
        if (removed !== null && removed !== undefined) return id
      }
      await wait()
      store().removeRow(kind, id)
      return id
    },
  }
}

export const db = {
  members: makeResource('memberships', TABLES.members, { prepare: withMemberNo }),
  transactions: makeResource('transactions', TABLES.transactions),
  pledges: makeResource('pledges', TABLES.pledges),
  budgets: makeResource('budgets', TABLES.budgets),
  // double-entry books
  accounts: makeResource('accounts', TABLES.accounts),
  vouchers: makeResource('vouchers', TABLES.vouchers),
  grants: makeResource('grants', TABLES.grants),
  receipts: makeResource('receipts', TABLES.receipts),
  feeReceipts: makeResource('feeReceipts', TABLES.feeReceipts),
}

/** React Query keys — one place so invalidation stays consistent. */
export const qk = {
  members: ['members'],
  transactions: ['transactions'],
  pledges: ['pledges'],
  budgets: ['budgets'],
  accounts: ['accounts'],
  vouchers: ['vouchers'],
  grants: ['grants'],
  receipts: ['receipts'],
  feeReceipts: ['feeReceipts'],
}

export { isSupabase, isApiMode }
export default db

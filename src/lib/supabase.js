import { createClient } from '@supabase/supabase-js'

/**
 * OPTIONAL backend.
 * Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local and the membership
 * + finance systems read/write Postgres instead of the browser store. With nothing set,
 * everything runs locally (see src/lib/db.js).
 *
 * Table schema is in DEPLOY.md → "Supabase setup".
 */
const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = url && anonKey ? createClient(url, anonKey) : null
export const isSupabase = Boolean(supabase)

export const TABLES = {
  members: 'members',
  transactions: 'transactions',
  pledges: 'pledges',
  budgets: 'budgets',
  accounts: 'accounts',
  vouchers: 'vouchers',
  grants: 'grants',
  receipts: 'receipts',
  // Membership fee receipts are a separate book from 80G donation receipts.
  feeReceipts: 'fee_receipts',
}

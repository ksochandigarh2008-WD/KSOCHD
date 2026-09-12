import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { db, qk } from '../../lib/db'

/**
 * React Query hooks for the membership + finance systems.
 * Works identically against the local store or Supabase (see src/lib/db.js).
 */

const invalidate = (qc, keys) => keys.forEach((k) => qc.invalidateQueries({ queryKey: k }))

/* ------------------------------- members -------------------------------- */
export const useMembers = () =>
  useQuery({ queryKey: qk.members, queryFn: db.members.list, staleTime: 10_000 })

export const useCreateMember = () => {
  const qc = useQueryClient()
  return useMutation({ mutationFn: db.members.create, onSuccess: () => invalidate(qc, [qk.members]) })
}
export const useUpdateMember = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, patch }) => db.members.update(id, patch),
    onSuccess: () => invalidate(qc, [qk.members]),
  })
}
export const useDeleteMember = () => {
  const qc = useQueryClient()
  return useMutation({ mutationFn: db.members.remove, onSuccess: () => invalidate(qc, [qk.members]) })
}

/* ----------------------------- transactions ------------------------------ */
export const useTransactions = () =>
  useQuery({ queryKey: qk.transactions, queryFn: db.transactions.list, staleTime: 10_000 })

/**
 * Transactions and vouchers are two views of the same money: the store posts a
 * voucher for every transaction. Any transaction change must therefore refresh
 * BOTH queries, or the books in Accounts/Reports go stale behind the Finance tab.
 */
const TXN_KEYS = [qk.transactions, qk.vouchers]

export const useCreateTransaction = () => {
  const qc = useQueryClient()
  return useMutation({ mutationFn: db.transactions.create, onSuccess: () => invalidate(qc, TXN_KEYS) })
}
export const useUpdateTransaction = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, patch }) => db.transactions.update(id, patch),
    onSuccess: () => invalidate(qc, TXN_KEYS),
  })
}
export const useDeleteTransaction = () => {
  const qc = useQueryClient()
  return useMutation({ mutationFn: db.transactions.remove, onSuccess: () => invalidate(qc, TXN_KEYS) })
}

/* -------------------------------- pledges -------------------------------- */
export const usePledges = () => useQuery({ queryKey: qk.pledges, queryFn: db.pledges.list, staleTime: 30_000 })
export const useCreatePledge = () => {
  const qc = useQueryClient()
  return useMutation({ mutationFn: db.pledges.create, onSuccess: () => invalidate(qc, [qk.pledges]) })
}
export const useUpdatePledge = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, patch }) => db.pledges.update(id, patch),
    onSuccess: () => invalidate(qc, [qk.pledges]),
  })
}
export const useDeletePledge = () => {
  const qc = useQueryClient()
  return useMutation({ mutationFn: db.pledges.remove, onSuccess: () => invalidate(qc, [qk.pledges]) })
}

/* -------------------------------- budgets -------------------------------- */
export const useBudgets = () => useQuery({ queryKey: qk.budgets, queryFn: db.budgets.list, staleTime: 60_000 })
export const useCreateBudget = () => {
  const qc = useQueryClient()
  return useMutation({ mutationFn: db.budgets.create, onSuccess: () => invalidate(qc, [qk.budgets]) })
}
export const useUpdateBudget = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, patch }) => db.budgets.update(id, patch),
    onSuccess: () => invalidate(qc, [qk.budgets]),
  })
}
export const useDeleteBudget = () => {
  const qc = useQueryClient()
  return useMutation({ mutationFn: db.budgets.remove, onSuccess: () => invalidate(qc, [qk.budgets]) })
}

/* ---------------------- double-entry books (accounts) -------------------- */
export const useAccounts = () => useQuery({ queryKey: qk.accounts, queryFn: db.accounts.list, staleTime: 60_000 })
export const useCreateAccount = () => {
  const qc = useQueryClient()
  return useMutation({ mutationFn: db.accounts.create, onSuccess: () => invalidate(qc, [qk.accounts]) })
}
export const useUpdateAccount = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, patch }) => db.accounts.update(id, patch),
    onSuccess: () => invalidate(qc, [qk.accounts]),
  })
}
export const useDeleteAccount = () => {
  const qc = useQueryClient()
  return useMutation({ mutationFn: db.accounts.remove, onSuccess: () => invalidate(qc, [qk.accounts]) })
}

/* -------------------------------- vouchers ------------------------------- */
export const useVouchers = () => useQuery({ queryKey: qk.vouchers, queryFn: db.vouchers.list, staleTime: 10_000 })
export const useCreateVoucher = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: db.vouchers.create,
    onSuccess: () => invalidate(qc, [qk.vouchers, qk.transactions]),
  })
}
export const useUpdateVoucher = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, patch }) => db.vouchers.update(id, patch),
    onSuccess: () => invalidate(qc, [qk.vouchers]),
  })
}
export const useDeleteVoucher = () => {
  const qc = useQueryClient()
  return useMutation({ mutationFn: db.vouchers.remove, onSuccess: () => invalidate(qc, [qk.vouchers]) })
}

/* --------------------------------- grants -------------------------------- */
export const useGrants = () => useQuery({ queryKey: qk.grants, queryFn: db.grants.list, staleTime: 60_000 })
export const useCreateGrant = () => {
  const qc = useQueryClient()
  return useMutation({ mutationFn: db.grants.create, onSuccess: () => invalidate(qc, [qk.grants]) })
}
export const useUpdateGrant = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, patch }) => db.grants.update(id, patch),
    onSuccess: () => invalidate(qc, [qk.grants]),
  })
}
export const useDeleteGrant = () => {
  const qc = useQueryClient()
  return useMutation({ mutationFn: db.grants.remove, onSuccess: () => invalidate(qc, [qk.grants]) })
}

/* ------------------------------- 80G receipts ---------------------------- */
export const useReceipts = () => useQuery({ queryKey: qk.receipts, queryFn: db.receipts.list, staleTime: 30_000 })
export const useCreateReceipt = () => {
  const qc = useQueryClient()
  return useMutation({ mutationFn: db.receipts.create, onSuccess: () => invalidate(qc, [qk.receipts]) })
}
export const useDeleteReceipt = () => {
  const qc = useQueryClient()
  return useMutation({ mutationFn: db.receipts.remove, onSuccess: () => invalidate(qc, [qk.receipts]) })
}

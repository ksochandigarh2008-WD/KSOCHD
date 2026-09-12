import { useState, useMemo } from 'react'
import { parseISO } from 'date-fns'

/**
 * Filter state for the transactions table, plus the filtered rows themselves.
 * Kept together so the panel stays presentational and the parent stays readable.
 */
export function useTransactionFilters(transactions, { range, period }) {
  const [typeFilter, setTypeFilter] = useState('all')
  const [catFilter, setCatFilter] = useState('all')
  const [progFilter, setProgFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [q, setQ] = useState('')

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return transactions.filter((t) => {
      if (period !== 'all' && t.date) {
        const d = parseISO(t.date)
        if (d < range.from || d > range.to) return false
      }
      if (typeFilter !== 'all' && t.type !== typeFilter) return false
      if (catFilter !== 'all' && t.category !== catFilter) return false
      if (progFilter !== 'all' && (t.program || '') !== progFilter) return false
      if (statusFilter !== 'all' && t.status !== statusFilter) return false
      if (!needle) return true
      return [t.party, t.note, t.reference, t.category, t.method].filter(Boolean).join(' ').toLowerCase().includes(needle)
    })
  }, [transactions, range, period, typeFilter, catFilter, progFilter, statusFilter, q])

  const clearFilters = () => { setTypeFilter('all'); setCatFilter('all'); setProgFilter('all'); setStatusFilter('all'); setQ('') }

  return {
    filtered,
    clearFilters,
    filters: { q, typeFilter, catFilter, progFilter, statusFilter },
    setters: { setQ, setTypeFilter, setCatFilter, setProgFilter, setStatusFilter },
  }
}

import { useState, useMemo } from 'react'

/**
 * Filter and sort state for the member directory, plus the rows themselves.
 * Kept together so the panel stays presentational and the parent stays readable.
 */
export function useMemberFilters(members, totals) {
  const [q, setQ] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [tierFilter, setTierFilter] = useState('all')
  const [sort, setSort] = useState('name')

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    let rows = members.filter((m) => {
      if (typeFilter !== 'all' && m.type !== typeFilter) return false
      if (statusFilter !== 'all' && m.status !== statusFilter) return false
      if (tierFilter !== 'all' && m.tier !== tierFilter) return false
      if (!needle) return true
      return [m.name, m.email, m.phone, m.memberNo, m.centre, m.skills, m.city]
        .filter(Boolean).join(' ').toLowerCase().includes(needle)
    })
    const cmp = {
      name: (a, b) => a.name.localeCompare(b.name),
      joined: (a, b) => String(b.joined).localeCompare(String(a.joined)),
      renews: (a, b) => String(a.renewsOn || '9999').localeCompare(String(b.renewsOn || '9999')),
      given: (a, b) => (totals.get(b.id)?.given || 0) - (totals.get(a.id)?.given || 0),
    }[sort]
    return [...rows].sort(cmp)
  }, [members, q, typeFilter, statusFilter, tierFilter, sort, totals])

  const resetFilters = () => { setQ(''); setTypeFilter('all'); setStatusFilter('all'); setTierFilter('all') }
  const hasFilters = q || typeFilter !== 'all' || statusFilter !== 'all' || tierFilter !== 'all'

  return {
    filtered,
    resetFilters,
    hasFilters,
    filters: { q, typeFilter, statusFilter, tierFilter, sort },
    setters: { setQ, setTypeFilter, setStatusFilter, setTierFilter, setSort },
  }
}

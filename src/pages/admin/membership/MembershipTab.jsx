import { useMemo, useState, useEffect, useCallback, useRef } from 'react'
import { toast } from 'sonner'
import { format, parseISO, addYears, addMonths } from 'date-fns'
import { Users, UserPlus, Download, Trash2, UserCheck, CalendarClock, Wallet, TrendingUp, IdCard } from 'lucide-react'
import { Button, StatCard, Tabs, TabsList, TabsTrigger, ConfirmDialog } from '../../../components/admin/ui'
import { useQueryClient } from '@tanstack/react-query'
import { useMembers, useUpdateMember, useDeleteMember, useTransactions, useCreateTransaction } from '../hooks'
import { memberTotals, renewalState, membershipGrowth, money, toCSV } from '../../../lib/finance'
import { downloadFile } from '../../../lib/utils'
import { useSite } from '../../../store/useSite'
import { isSupabase } from '../../../lib/supabase'
import MemberForm from './MemberForm'
import MemberDetail from './MemberDetail'
import DirectoryPanel from './DirectoryPanel'
import InsightsPanel from './InsightsPanel'
import TiersPanel from './TiersPanel'
import { useMemberFilters } from './useMemberFilters'

const currentYear = () => new Date().getFullYear()

/**
 * Membership management: directory, insights and tiers.
 *
 * This file owns the queries, mutations and CSV export; each tab is rendered by
 * its own panel in this folder. Filters live in useMemberFilters.
 */
export default function MembershipTab() {
  const { data: members = [], isLoading } = useMembers()
  const { data: transactions = [] } = useTransactions()
  const updateMember = useUpdateMember()
  const deleteMember = useDeleteMember()
  const createTransaction = useCreateTransaction()
  const qc = useQueryClient()
  const clearDemoRows = useSite((s) => s.clearDemoRows)
  const resetDemoRows = useSite((s) => s.resetDemoRows)
  const hasDemo = members.some((m) => m.demo)

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [detail, setDetail] = useState(null)
  const [confirm, setConfirm] = useState(null)

  const totals = useMemo(() => memberTotals(transactions, members), [transactions, members])

  const { filtered, resetFilters, hasFilters, filters, setters } = useMemberFilters(members, totals)

  const stats = useMemo(() => {
    const now = new Date()
    const renewal = members.filter((m) => ['amber', 'red'].includes(renewalState(m).tone)).length
    const joinedThisYear = members.filter((m) => m.joined && String(m.joined).startsWith(String(currentYear()))).length
    const feeIncome = transactions
      .filter((t) => t.type === 'income' && t.category === 'Membership fee')
      .reduce((a, t) => a + Number(t.amount || 0), 0)
    return {
      total: members.length,
      active: members.filter((m) => m.status === 'Active').length,
      pending: members.filter((m) => m.status === 'Pending').length,
      renewal,
      joinedThisYear,
      feeIncome,
    }
  }, [members, transactions])

  const growth = useMemo(() => membershipGrowth(members, 6), [members])

  const typeMix = useMemo(() => {
    const map = new Map()
    members.forEach((m) => map.set(m.type, (map.get(m.type) || 0) + 1))
    return [...map.entries()].map(([name, value]) => ({ name, value }))
  }, [members])

  const exportCsv = () => {
    const rows = filtered.map((m) => ({
      'Member No': m.memberNo, Name: m.name, Email: m.email, Phone: m.phone, Type: m.type, Tier: m.tier,
      Status: m.status, Centre: m.centre, Joined: m.joined, 'Renews On': m.renewsOn,
      Fee: m.feeAmount, Cycle: m.feeCycle, City: m.city, Skills: m.skills,
      Household: (m.household || []).map((h) => `${h.name} (${h.relation})`).join('; '),
      Contributed: totals.get(m.id)?.given || 0, Events: m.eventsAttended || 0, Notes: m.notes,
    }))
    const headers = ['Member No', 'Name', 'Email', 'Phone', 'Type', 'Tier', 'Status', 'Centre', 'Joined', 'Renews On', 'Fee', 'Cycle', 'City', 'Skills', 'Household', 'Contributed', 'Events', 'Notes']
    downloadFile(`kso-members-${new Date().toISOString().slice(0, 10)}.csv`, toCSV(rows, headers), 'text/csv')
    toast.success(`Exported ${rows.length} members`)
  }

  const renew = async (m, recordFee = true) => {
    const cycle = m.feeCycle === 'monthly' ? 'monthly' : 'annual'
    const base = m.renewsOn && new Date(m.renewsOn) > new Date() ? new Date(m.renewsOn) : new Date()
    const nextRenewal = (cycle === 'monthly' ? addMonths(base, 1) : addYears(base, 1)).toISOString().slice(0, 10)
    try {
      // Money first. If the fee write fails, nothing has changed — rather that
      // than a member marked renewed with the fee never reaching the books.
      if (recordFee && Number(m.feeAmount) > 0) {
        await createTransaction.mutateAsync({
          date: new Date().toISOString().slice(0, 10),
          type: 'income',
          category: 'Membership fee',
          amount: Number(m.feeAmount),
          program: '',
          party: m.name,
          method: 'UPI',
          reference: `RENEW-${m.memberNo}`,
          status: 'Cleared',
          note: `${m.tier} renewal — ${cycle}`,
          memberId: m.id,
        })
      }
      await updateMember.mutateAsync({ id: m.id, patch: { renewsOn: nextRenewal, status: 'Active' } })
      toast.success(`${m.name} renewed until ${format(parseISO(nextRenewal), 'dd MMM yyyy')}`)
      setDetail(null)
    } catch (e) {
      toast.error(`Renewal failed: ${e.message}`)
    }
  }

  const setStatus = async (m, status) => {
    try {
      await updateMember.mutateAsync({ id: m.id, patch: { status } })
      toast.success(`${m.name} → ${status}`)
    } catch (e) {
      toast.error(e.message)
    }
  }

  const removeMember = async (id) => {
    try {
      await deleteMember.mutateAsync(id)
      toast.success('Member removed')
      setConfirm(null)
      setDetail(null)
    } catch (e) {
      toast.error(e.message)
    }
  }

  const memberContributions = (m) =>
    transactions.filter(
      (t) => t.type === 'income' && (t.memberId === m.id || String(t.party || '').toLowerCase() === String(m.name || '').toLowerCase()),
    )


  // ⌘K palette hooks (Admin → Search)
  const openAddForm = useCallback(() => { setEditing(null); setFormOpen(true) }, [])
  useEffect(() => {
    window.addEventListener('kso:add-member', openAddForm)
    return () => window.removeEventListener('kso:add-member', openAddForm)
  }, [openAddForm])
  const exportRef = useRef(exportCsv)
  exportRef.current = exportCsv
  useEffect(() => {
    const h = () => exportRef.current()
    window.addEventListener('kso:export-members', h)
    return () => window.removeEventListener('kso:export-members', h)
  }, [])

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Membership management</h1>
          <p className="text-sm text-ink-500">
            {members.length} records · {stats.active} active · {stats.renewal} need renewal
            {isSupabase ? ' · Supabase connected' : ' · stored locally'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {hasDemo && (
            <Button variant="ghost" onClick={() => { clearDemoRows(); qc.invalidateQueries(); toast.success('Demo members removed') }}>
              <Trash2 className="h-4 w-4" /> Remove demo rows
            </Button>
          )}
          <Button variant="outline" onClick={exportCsv} disabled={!filtered.length}>
            <Download className="h-4 w-4" /> Export CSV
          </Button>
          <Button onClick={() => { setEditing(null); setFormOpen(true) }}>
            <UserPlus className="h-4 w-4" /> Add member
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total members" value={stats.total} icon={Users} hint={`${stats.joinedThisYear} joined this year`} />
        <StatCard label="Active" value={stats.active} icon={UserCheck} tone="green" hint={`${stats.pending} awaiting approval`} />
        <StatCard label="Renewal due" value={stats.renewal} icon={CalendarClock} tone="amber" hint="Expired or due within 30 days" />
        <StatCard label="Fee income" value={money(stats.feeIncome)} icon={Wallet} tone="accent" hint="Membership fees received" />
      </div>

      <Tabs defaultValue="directory">
        <TabsList>
          <TabsTrigger value="directory"><Users className="h-3.5 w-3.5" /> Directory</TabsTrigger>
          <TabsTrigger value="insights"><TrendingUp className="h-3.5 w-3.5" /> Insights</TabsTrigger>
          <TabsTrigger value="tiers"><IdCard className="h-3.5 w-3.5" /> Tiers &amp; fees</TabsTrigger>
        </TabsList>

        <DirectoryPanel
          members={members} filtered={filtered} isLoading={isLoading} totals={totals} hasFilters={hasFilters}
          q={filters.q} onQuery={setters.setQ}
          typeFilter={filters.typeFilter} onTypeFilter={setters.setTypeFilter}
          statusFilter={filters.statusFilter} onStatusFilter={setters.setStatusFilter}
          tierFilter={filters.tierFilter} onTierFilter={setters.setTierFilter}
          sort={filters.sort} onSort={setters.setSort}
          onResetFilters={resetFilters}
          onEdit={(m) => { setEditing(m); setFormOpen(true) }}
          onOpen={setDetail}
          onDelete={setConfirm}
          onSetStatus={setStatus}
          onAdd={() => { setEditing(null); setFormOpen(true) }}
          onRenew={renew}
        />

        <InsightsPanel members={members} totals={totals} growth={growth} typeMix={typeMix} />

        <TiersPanel members={members} />
      </Tabs>

      <MemberForm open={formOpen} onOpenChange={setFormOpen} member={editing} onSaved={() => setEditing(null)} />
      <MemberDetail
        member={detail}
        open={Boolean(detail)}
        onOpenChange={(v) => !v && setDetail(null)}
        contributions={detail ? memberContributions(detail) : []}
        onEdit={() => { setEditing(detail); setDetail(null); setFormOpen(true) }}
      />
      <ConfirmDialog
        open={Boolean(confirm)}
        onOpenChange={(v) => !v && setConfirm(null)}
        title={`Remove ${confirm?.name}?`}
        description="This deletes the membership record permanently. Their past transactions stay in the finance ledger."
        confirmLabel="Delete member"
        destructive
        onConfirm={() => removeMember(confirm.id)}
      />
    </div>
  )
}
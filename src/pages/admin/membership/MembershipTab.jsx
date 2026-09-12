import { useMemo, useState, useEffect, useCallback, useRef } from 'react'
import { toast } from 'sonner'
import { format, parseISO } from 'date-fns'
import { Users, UserPlus, Download, Trash2, UserCheck, CalendarClock, Wallet, TrendingUp, IdCard, AlertTriangle, ReceiptText } from 'lucide-react'
import { Button, StatCard, Tabs, TabsList, TabsTrigger, ConfirmDialog } from '../../../components/admin/ui'
import { useQueryClient } from '@tanstack/react-query'
import {
  useMembers, useUpdateMember, useDeleteMember, useTransactions, useCreateTransaction,
  useFeeReceipts, useCreateFeeReceipt,
} from '../hooks'
import { memberTotals, renewalState, membershipGrowth, money, toCSV, fyLabelOf } from '../../../lib/finance'
import {
  MEMBERSHIP_FEE_CATEGORY, cycleLabel, duesSummary, effectiveStatus, isRenewable,
  membershipDues, nextRenewalDate, reconcileStatuses,
} from '../../../lib/membership'
import { nextFeeReceiptNo } from '../../../lib/accounting'
import { buildFeeReceipt, downloadFeeReceipt as downloadFeeReceiptPdf } from '../../../lib/documents'
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
  const { data: feeReceipts = [] } = useFeeReceipts()
  const createFeeReceipt = useCreateFeeReceipt()
  const qc = useQueryClient()
  const clearDemoRows = useSite((s) => s.clearDemoRows)
  const resetDemoRows = useSite((s) => s.resetDemoRows)
  const settings = useSite((s) => s.settings)
  const content = useSite((s) => s.content)
  const reconcileMemberStatuses = useSite((s) => s.reconcileMemberStatuses)
  const hasDemo = members.some((m) => m.demo)

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [detail, setDetail] = useState(null)
  const [confirm, setConfirm] = useState(null)

  const totals = useMemo(() => memberTotals(transactions, members), [transactions, members])

  const { filtered, resetFilters, hasFilters, filters, setters } = useMemberFilters(members, totals)

  /** Dues for the financial year in progress: expected, collected, outstanding. */
  const dues = useMemo(() => membershipDues(members, transactions, settings), [members, transactions, settings])
  const duesByMember = useMemo(() => new Map(dues.map((d) => [d.id, d])), [dues])
  const arrears = useMemo(() => duesSummary(dues), [dues])

  /** Members whose stored status disagrees with their renewal date. */
  const stale = useMemo(() => reconcileStatuses(members), [members])

  const stats = useMemo(() => {
    const joinedThisYear = members.filter((m) => m.joined && String(m.joined).startsWith(String(currentYear()))).length
    const feeIncome = transactions
      .filter((t) => t.type === 'income' && t.category === MEMBERSHIP_FEE_CATEGORY)
      .reduce((a, t) => a + Number(t.amount || 0), 0)
    return {
      total: members.length,
      // Counted from the renewal date, not the stored status, so the headline
      // figure cannot be inflated by a status nobody has updated.
      active: members.filter((m) => effectiveStatus(m).status === 'Active').length,
      pending: members.filter((m) => m.status === 'Pending').length,
      renewal: members.filter((m) => ['amber', 'red'].includes(renewalState(m).tone)).length,
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

  /**
   * Renew one membership.
   *
   * The policy lives in lib/membership.js so every caller agrees: monthly and
   * annual roll forward and can record the fee, while one-time and no-fee
   * memberships are refused rather than quietly charged again (they used to be
   * treated as annual, which is how a life member ends up billed every year).
   */
  const renew = async (m, recordFee = true) => {
    if (!isRenewable(m.feeCycle)) {
      toast.error(`${m.name} is on a ${cycleLabel(m.feeCycle)}. Set a renewable fee cycle first — nothing was charged.`)
      return
    }

    const nextRenewal = nextRenewalDate(m)
    const today = new Date().toISOString().slice(0, 10)
    const fee = Number(m.feeAmount) > 0 ? Number(m.feeAmount) : 0

    try {
      // Money first. If the fee write fails, nothing has changed — rather than a
      // member marked renewed with the fee never reaching the books.
      if (recordFee && fee > 0) {
        await createTransaction.mutateAsync({
          date: today,
          type: 'income',
          category: MEMBERSHIP_FEE_CATEGORY,
          amount: fee,
          program: '',
          party: m.name,
          method: 'UPI',
          reference: `RENEW-${m.memberNo}`,
          status: 'Cleared',
          note: `${m.tier} renewal — ${m.feeCycle}`,
          memberId: m.id,
        })
      }
      await updateMember.mutateAsync({ id: m.id, patch: { renewsOn: nextRenewal, status: 'Active' } })

      // A numbered receipt for the fee, in its own series. Issued last and
      // allowed to fail without failing the renewal: the money and the date are
      // the substance, the paperwork can be reissued.
      if (recordFee && fee > 0) {
        try {
          const no = nextFeeReceiptNo(feeReceipts, today)
          await createFeeReceipt.mutateAsync({
            no, date: today, kind: 'membership-fee',
            memberId: m.id, memberName: m.name, memberNo: m.memberNo,
            tier: m.tier, cycle: m.feeCycle, period: fyLabelOf(today),
            amount: fee, method: 'UPI',
          })
          toast.success(`${m.name} renewed to ${format(parseISO(nextRenewal), 'dd MMM yyyy')} · receipt ${no}`)
        } catch (e) {
          toast.warning(`${m.name} renewed, but the receipt could not be issued: ${e.message}`)
        }
      } else {
        toast.success(`${m.name} renewed to ${format(parseISO(nextRenewal), 'dd MMM yyyy')} (no fee recorded)`)
      }
      setDetail(null)
    } catch (e) {
      toast.error(`Renewal failed: ${e.message}`)
    }
  }

  /** Apply every status the renewal dates disagree with, in one reviewed step. */
  const reconcile = () => {
    const changed = reconcileMemberStatuses()
    if (changed) toast.success(`${changed} membership status${changed === 1 ? '' : 'es'} brought in line`)
    else toast('Every status already matches its renewal date')
  }

  const downloadFeeReceipt = async (receipt, member) => {
    try {
      const model = buildFeeReceipt({ receipt, settings, org: content.org, member })
      await downloadFeeReceiptPdf(model)
    } catch (e) {
      toast.error(`Could not build the receipt: ${e.message}`)
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
          {stale.length > 0 && (
            <Button variant="outline" onClick={reconcile}>
              <AlertTriangle className="h-4 w-4" /> Reconcile {stale.length} status{stale.length === 1 ? '' : 'es'}
            </Button>
          )}
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
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Total members" value={stats.total} icon={Users} hint={`${stats.joinedThisYear} joined this year`} />
        <StatCard label="Active" value={stats.active} icon={UserCheck} tone="green" hint={`${stats.pending} awaiting approval`} />
        <StatCard label="Renewal due" value={stats.renewal} icon={CalendarClock} tone="amber" hint="Expired or due within 30 days" />
        <StatCard label="Fee income" value={money(stats.feeIncome)} icon={Wallet} tone="accent" hint="Membership fees received" />
        <StatCard
          label="Arrears" value={money(arrears.outstanding)} icon={ReceiptText}
          tone={arrears.outstanding > 0 ? 'amber' : 'green'}
          hint={`${arrears.unpaidCount} owing · ${money(arrears.collected)} collected this FY`}
        />
      </div>

      <Tabs defaultValue="directory">
        <TabsList>
          <TabsTrigger value="directory"><Users className="h-3.5 w-3.5" /> Directory</TabsTrigger>
          <TabsTrigger value="insights"><TrendingUp className="h-3.5 w-3.5" /> Insights</TabsTrigger>
          <TabsTrigger value="tiers"><IdCard className="h-3.5 w-3.5" /> Tiers &amp; fees</TabsTrigger>
        </TabsList>

        <DirectoryPanel
          members={members} filtered={filtered} isLoading={isLoading} totals={totals} hasFilters={hasFilters}
          duesByMember={duesByMember} settings={settings}
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
        dues={detail ? duesByMember.get(detail.id) : null}
        receipts={feeReceipts.filter((r) => detail && r.memberId === detail.id)}
        onDownloadReceipt={(r) => downloadFeeReceipt(r, detail)}
        onRenew={detail ? () => renew(detail, true) : undefined}
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
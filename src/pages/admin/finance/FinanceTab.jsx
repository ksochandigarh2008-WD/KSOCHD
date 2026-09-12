import { useMemo, useState, useEffect, useCallback, useRef } from 'react'
import { toast } from 'sonner'
import { parseISO, addMonths, addYears, differenceInCalendarMonths } from 'date-fns'
import {
  Wallet, Plus, Download, TrendingUp, TrendingDown, Target, Receipt, CalendarClock,
  Trash2, PieChart as PieIcon,
} from 'lucide-react'
import { Button, SelectField, StatCard, Tabs, TabsList, TabsTrigger, ConfirmDialog } from '../../../components/admin/ui'
import {
  useTransactions, useCreateTransaction, useUpdateTransaction, useDeleteTransaction,
  useBudgets, useCreateBudget, useUpdateBudget, useDeleteBudget,
  usePledges, useCreatePledge, useUpdatePledge, useDeletePledge, useMembers,
} from '../hooks'
import { useQueryClient } from '@tanstack/react-query'
import {
  PERIODS, periodRange, inPeriod, monthlySeries, categoryBreakdown, programTotals,
  budgetVsActual, financeKpis, sumBy, money, toCSV, previousPeriod, currentFy, fyOptions,
} from '../../../lib/finance'
import { useSite } from '../../../store/useSite'
import { downloadFile } from '../../../lib/utils'
import { isSupabase } from '../../../lib/supabase'
import OverviewPanel from './OverviewPanel'
import TransactionsPanel from './TransactionsPanel'
import BudgetsPanel from './BudgetsPanel'
import PledgesPanel from './PledgesPanel'
import TransactionForm from './TransactionForm'
import PledgeForm from './PledgeForm'
import { useTransactionFilters } from './useTransactionFilters'

/**
 * Financial management: overview, transactions, budgets and commitments.
 *
 * This file owns the data and the mutations; each tab is rendered by its own
 * panel component in this folder. Filters live in useTransactionFilters.
 */
export default function FinanceTab() {
  // Only the programme list is needed here, so subscribe to just that.
  const programs = useSite((s) => s.content.programs) || []

  const { data: transactions = [], isLoading } = useTransactions()
  const { data: budgets = [] } = useBudgets()
  const { data: pledges = [] } = usePledges()
  const { data: members = [] } = useMembers()
  const createTxn = useCreateTransaction()
  const qc = useQueryClient()
  const clearDemoRows = useSite((s) => s.clearDemoRows)
  const resetDemoRows = useSite((s) => s.resetDemoRows)
  const hasDemo = transactions.some((t) => t.demo) || budgets.some((b) => b.demo) || pledges.some((x) => x.demo)
  const updateTxn = useUpdateTransaction()
  const deleteTxn = useDeleteTransaction()
  const createBudget = useCreateBudget()
  const updateBudget = useUpdateBudget()
  const deleteBudget = useDeleteBudget()
  const createPledge = useCreatePledge()
  const updatePledge = useUpdatePledge()
  const deletePledge = useDeletePledge()

  const [period, setPeriod] = useState('half')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [pledgeForm, setPledgeForm] = useState({ open: false, pledge: null })
  const [confirm, setConfirm] = useState(null)
  const [budgetDraft, setBudgetDraft] = useState({ program: programs[0]?.slug || '', fy: currentFy(), amount: '' })

  const range = useMemo(() => periodRange(period), [period])
  // Compare like with like: the preceding window must be the SAME length as the
  // selected one, otherwise "vs previous period" compares, say, six months
  // against a full twelve. "All time" has no previous period at all.
  const prevRange = useMemo(() => previousPeriod(range, period), [period, range])

  const periodTxns = useMemo(() => inPeriod(transactions, range), [transactions, range])
  const prevTxns = useMemo(() => (prevRange ? inPeriod(transactions, prevRange) : []), [transactions, prevRange])

  const kpis = useMemo(() => financeKpis(periodTxns, pledges, members), [periodTxns, pledges, members])
  const prevKpis = useMemo(() => (prevRange ? financeKpis(prevTxns, [], []) : null), [prevTxns, prevRange])

  const growthPct = (now, before) => (prevKpis && before > 0 ? Math.round(((now - before) / before) * 100) : null)

  const chartMonths = useMemo(
    () => (period === 'all' ? 12 : Math.max(1, differenceInCalendarMonths(range.to, range.from) + 1)),
    [period, range],
  )
  const series = useMemo(() => monthlySeries(transactions, chartMonths), [transactions, chartMonths])
  const expenseMix = useMemo(() => categoryBreakdown(periodTxns, 'expense'), [periodTxns])
  const incomeMix = useMemo(() => categoryBreakdown(periodTxns, 'income'), [periodTxns])
  const byProgram = useMemo(() => programTotals(periodTxns, programs), [periodTxns, programs])
  const budgetFys = useMemo(() => {
    const set = new Set(fyOptions(3))
    budgets.forEach((b) => {
      if (b.fy) set.add(b.fy)
      else if (b.year) set.add(`${b.year}-${String((Number(b.year) + 1) % 100).padStart(2, '0')}`)
    })
    return [...set].sort().reverse()
  }, [budgets])
  const [budgetFy, setBudgetFy] = useState(currentFy())
  const budgetsVsActual = useMemo(
    () => budgetVsActual(transactions, budgets, budgetFy, programs),
    [transactions, budgets, programs, budgetFy],
  )

  const { filtered, clearFilters, filters, setters } = useTransactionFilters(transactions, { range, period })

  const exportCsv = () => {
    const rows = filtered.map((t) => ({
      Date: t.date, Type: t.type, Category: t.category, Amount: t.amount,
      Programme: programs.find((p) => p.slug === t.program)?.title || 'General',
      Party: t.party, Method: t.method, Reference: t.reference, Status: t.status, Note: t.note,
    }))
    const headers = ['Date', 'Type', 'Category', 'Amount', 'Programme', 'Party', 'Method', 'Reference', 'Status', 'Note']
    downloadFile(`kso-finance-${new Date().toISOString().slice(0, 10)}.csv`, toCSV(rows, headers), 'text/csv')
    toast.success(`Exported ${rows.length} transactions`)
  }

  const saveBudget = async () => {
    try {
      const existing = budgets.find((b) => b.program === budgetDraft.program && String(b.fy || '') === String(budgetDraft.fy))
      if (existing) await updateBudget.mutateAsync({ id: existing.id, patch: { amount: Number(budgetDraft.amount) } })
      else await createBudget.mutateAsync({ program: budgetDraft.program, fy: budgetDraft.fy, amount: Number(budgetDraft.amount) })
      toast.success('Budget saved')
      setBudgetDraft({ ...budgetDraft, amount: '' })
    } catch (e) { toast.error(e.message) }
  }

  const programLabel = (slug) => programs.find((p) => p.slug === slug)?.title || 'General fund'

  const recordPledgePayment = async (p) => {
    try {
      await createTxn.mutateAsync({
        date: new Date().toISOString().slice(0, 10),
        type: 'income',
        category: p.frequency === 'annual' ? 'Donation' : 'Donation',
        amount: Number(p.amount),
        program: p.program || '',
        party: p.name,
        method: 'Bank transfer',
        reference: `PLEDGE-${String(p.name).slice(0, 6).toUpperCase()}`,
        status: 'Cleared',
        note: `${p.frequency} commitment received`,
        memberId: '',
      })
      const step = p.frequency === 'monthly' ? addMonths : addYears
      const next = step(parseISO(p.nextDue || p.startDate), 1).toISOString().slice(0, 10)
      await updatePledge.mutateAsync({ id: p.id, patch: { nextDue: next } })
      toast.success(`Recorded ${money(p.amount)} from ${p.name}`)
    } catch (e) {
      toast.error(e.message)
    }
  }

  // ⌘K palette hooks (Admin → Search)
  const openAddForm = useCallback(() => { setEditing(null); setFormOpen(true) }, [])
  useEffect(() => {
    window.addEventListener('kso:add-transaction', openAddForm)
    return () => window.removeEventListener('kso:add-transaction', openAddForm)
  }, [openAddForm])
  const exportRef = useRef(exportCsv)
  exportRef.current = exportCsv
  useEffect(() => {
    const h = () => exportRef.current()
    window.addEventListener('kso:export-finance', h)
    return () => window.removeEventListener('kso:export-finance', h)
  }, [])

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Financial management</h1>
          <p className="text-sm text-ink-500">
            {transactions.length} transactions · {range.label.toLowerCase()}
            {isSupabase ? ' · Supabase connected' : ' · stored locally'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="w-[170px]">
            <SelectField value={period} onChange={setPeriod} options={PERIODS.map((p) => ({ value: p.id, label: p.label }))} />
          </div>
          {hasDemo && (
            <Button variant="ghost" onClick={() => { clearDemoRows(); qc.invalidateQueries(); toast.success('Demo transactions removed') }}>
              <Trash2 className="h-4 w-4" /> Remove demo rows
            </Button>
          )}
          <Button variant="outline" onClick={exportCsv} disabled={!filtered.length}>
            <Download className="h-4 w-4" /> Export
          </Button>
          <Button onClick={() => { setEditing(null); setFormOpen(true) }}>
            <Plus className="h-4 w-4" /> Record entry
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Income" value={money(kpis.income)} icon={TrendingUp} tone="green"
          hint={`${kpis.donationCount} receipts`} trend={growthPct(kpis.income, prevKpis.income)} />
        <StatCard label="Expenses" value={money(kpis.expense)} icon={TrendingDown} tone="red"
          hint={`${kpis.overheadRatio}% overhead`} trend={growthPct(kpis.expense, prevKpis.expense)} />
        <StatCard label="Net balance" value={money(kpis.net)} icon={Wallet}
          tone={kpis.net >= 0 ? 'brand' : 'red'} hint={`${money(kpis.pending)} pending clearance`} />
        <StatCard label="Committed future" value={money(kpis.pledged)} icon={Target} tone="accent"
          hint={`${pledges.filter((p) => p.status === 'Active').length} active commitments`} />
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview"><PieIcon className="h-3.5 w-3.5" /> Overview</TabsTrigger>
          <TabsTrigger value="ledger"><Receipt className="h-3.5 w-3.5" /> Transactions</TabsTrigger>
          <TabsTrigger value="budgets"><Target className="h-3.5 w-3.5" /> Budgets</TabsTrigger>
          <TabsTrigger value="pledges"><CalendarClock className="h-3.5 w-3.5" /> Commitments</TabsTrigger>
        </TabsList>

        <OverviewPanel range={range} series={series} expenseMix={expenseMix} incomeMix={incomeMix} byProgram={byProgram} />

        <TransactionsPanel
          transactions={transactions} filtered={filtered} isLoading={isLoading}
          programs={programs} programLabel={programLabel}
          q={filters.q} onQuery={setters.setQ}
          typeFilter={filters.typeFilter} onType={setters.setTypeFilter}
          catFilter={filters.catFilter} onCategory={setters.setCatFilter}
          progFilter={filters.progFilter} onProgram={setters.setProgFilter}
          statusFilter={filters.statusFilter} onStatus={setters.setStatusFilter}
          onClearFilters={clearFilters}
          onEdit={(t) => { setEditing(t); setFormOpen(true) }}
          onDelete={setConfirm}
          onStatusChange={(args) => updateTxn.mutate(args)}
          onAdd={() => { setEditing(null); setFormOpen(true) }}
        />

        <BudgetsPanel
          budgets={budgets} budgetsVsActual={budgetsVsActual}
          budgetFy={budgetFy} onFy={setBudgetFy} budgetFys={budgetFys}
          programs={programs} programLabel={programLabel}
          budgetDraft={budgetDraft} onDraft={setBudgetDraft}
          onSave={saveBudget} onDeleteBudget={(id) => deleteBudget.mutate(id)}
        />

        <PledgesPanel
          pledges={pledges} programLabel={programLabel}
          onAdd={() => setPledgeForm({ open: true, pledge: null })}
          onEdit={(p) => setPledgeForm({ open: true, pledge: p })}
          onRecord={recordPledgePayment}
          onToggle={(p) => updatePledge.mutate({ id: p.id, patch: { status: p.status === 'Active' ? 'Paused' : 'Active' } })}
          onDelete={(id) => deletePledge.mutate(id)}
        />
      </Tabs>

      <TransactionForm
        open={formOpen} onOpenChange={setFormOpen} txn={editing} members={members} programs={programs}
        onSaved={() => setEditing(null)}
      />
      <PledgeForm
        open={pledgeForm.open} onOpenChange={(v) => setPledgeForm({ open: v, pledge: v ? pledgeForm.pledge : null })}
        pledge={pledgeForm.pledge} programs={programs} onSaved={() => setPledgeForm({ open: false, pledge: null })}
      />
      <ConfirmDialog
        open={Boolean(confirm)} onOpenChange={(v) => !v && setConfirm(null)}
        title="Delete this transaction?"
        description={`${confirm?.party} · ${money(confirm?.amount)} on ${confirm?.date}. This cannot be undone.`}
        confirmLabel="Delete" destructive
        onConfirm={async () => { await deleteTxn.mutateAsync(confirm.id); setConfirm(null); toast.success('Transaction deleted') }}
      />
    </div>
  )
}
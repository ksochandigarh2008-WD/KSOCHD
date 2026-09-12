import { useMemo, useState } from 'react'
import { format, parseISO } from 'date-fns'
import { Receipt, Trash2, Download, Zap, ArrowRight, Loader2 } from 'lucide-react'

import { Panel, TF } from './components'
import { useToast } from '../../components/ui'
import { Button, Card, SelectField, ConfirmDialog, EmptyState, Badge } from '../../components/admin/ui'
import { useTransactions, useCreateTransaction, useDeleteTransaction } from './hooks'
import { INCOME_CATEGORIES, EXPENSE_CATEGORIES, PAYMENT_METHODS } from '../../data/seedData'
import { money, toCSV } from '../../lib/finance'
import { downloadFile } from '../../lib/utils'

/**
 * QUICK ENTRY.
 *
 * This used to be the "quick ledger" — a second, separate list of money that
 * quietly disagreed with the finance system (the dashboard once reported it as
 * the organisation's income). It is now a fast path into the SAME transactions
 * the Finance, Accounts and Reports tabs read, so there is one store of money.
 */
export default function LedgerTab() {
  const { data: transactions = [], isLoading } = useTransactions()
  const create = useCreateTransaction()
  const remove = useDeleteTransaction()
  const toast = useToast()

  const today = () => new Date().toISOString().slice(0, 10)
  const [draft, setDraft] = useState({
    date: today(), type: 'income', amount: '', party: '', method: 'UPI',
    category: 'Donation', program: '', note: '',
  })
  const [confirm, setConfirm] = useState(null)

  const set = (k, v) => setDraft((d) => ({ ...d, [k]: v }))
  const categories = draft.type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES

  const recent = useMemo(
    () => [...transactions].sort((a, b) => String(b.date).localeCompare(String(a.date)) || String(b.id).localeCompare(String(a.id))).slice(0, 25),
    [transactions],
  )

  const submit = async (e) => {
    e.preventDefault()
    const amount = Number(draft.amount)
    if (!amount || amount <= 0) return toast('Enter an amount greater than zero', 'error')
    if (!draft.party.trim()) return toast('Add who it was from or paid to', 'error')
    try {
      await create.mutateAsync({
        date: draft.date,
        type: draft.type,
        category: draft.category,
        amount,
        program: draft.program,
        party: draft.party.trim(),
        method: draft.method,
        reference: '',
        status: 'Cleared',
        note: draft.note.trim(),
        memberId: '',
      })
      toast(`${draft.type === 'income' ? 'Receipt' : 'Payment'} recorded`)
      setDraft({ ...draft, amount: '', party: '', note: '' })
    } catch (err) {
      toast.error(err.message || 'Could not record the entry')
    }
  }

  const exportCsv = () => {
    const rows = recent.map((t) => ({
      Date: t.date, Type: t.type, Category: t.category, Amount: t.amount,
      Programme: t.program || '', Party: t.party, Method: t.method, Status: t.status, Note: t.note,
    }))
    const headers = ['Date', 'Type', 'Category', 'Amount', 'Programme', 'Party', 'Method', 'Status', 'Note']
    downloadFile(`kso-recent-entries-${today()}.csv`, toCSV(rows, headers), 'text/csv')
    toast.success(`Exported ${rows.length} entries`)
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Quick entry</h1>
          <p className="mt-0.5 max-w-2xl text-sm text-ink-500">
            A fast way to record money in and out. Entries land in the finance system straight away —
            they post a voucher, appear in Accounts, and flow through every statement in Reports.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={exportCsv}><Download className="h-3.5 w-3.5" /> Export CSV</Button>
      </header>

      <div className="grid gap-5 lg:grid-cols-[380px_minmax(0,1fr)]">
        <Card className="h-fit p-5">
          <form onSubmit={submit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="label">Type</span>
                <div className="mt-1 grid grid-cols-2 gap-1 rounded-xl bg-ink-900/5 p-1">
                  {['income', 'expense'].map((t) => (
                    <button
                      key={t} type="button"
                      onClick={() => setDraft((d) => ({ ...d, type: t, category: t === 'income' ? 'Donation' : 'Program expense' }))}
                      className={`rounded-lg px-3 py-1.5 text-xs font-bold capitalize transition ${draft.type === t ? 'bg-white shadow-sm' : 'text-ink-500'}`}
                    >
                      {t === 'income' ? 'Money in' : 'Money out'}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <span className="label">Amount ₹</span>
                <input
                  type="number" inputMode="decimal" value={draft.amount}
                  onChange={(e) => set('amount', e.target.value)}
                  placeholder="0" autoFocus
                  className="field mt-1"
                />
              </div>
            </div>

            <TF label={draft.type === 'income' ? 'Received from' : 'Paid to'} value={draft.party} onChange={(v) => set('party', v)} placeholder="Name" />
            <SelectField label="Category" value={draft.category} onChange={(v) => set('category', v)} options={categories} />
            <div className="grid grid-cols-2 gap-3">
              <SelectField label="Method" value={draft.method} onChange={(v) => set('method', v)} options={PAYMENT_METHODS.filter((m) => m !== 'In-kind')} />
              <TF label="Date" type="date" value={draft.date} onChange={(v) => set('date', v)} />
            </div>
            <TF label="Note (optional)" value={draft.note} onChange={(v) => set('note', v)} placeholder="What it was for" />

            <Button type="submit" className="w-full" disabled={create.isPending}>
              {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
              Record entry
            </Button>
            <p className="text-center text-[11px] text-ink-500">
              Posts to the books immediately — Finance, Accounts and Reports update together.
            </p>
          </form>
        </Card>

        <Panel title="Recent entries" desc="The 25 most recent transactions across the whole system.">
          {isLoading ? (
            <p className="py-8 text-center text-sm text-ink-500">Loading…</p>
          ) : recent.length === 0 ? (
            <EmptyState icon={Receipt} title="Nothing recorded yet" text="Use the form to record your first entry." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px] text-sm">
                <thead>
                  <tr className="border-b border-ink-900/8 text-left text-[11px] uppercase tracking-wide text-ink-500">
                    <th className="px-3 py-2.5 font-bold">Date</th>
                    <th className="px-3 py-2.5 font-bold">Party</th>
                    <th className="px-3 py-2.5 font-bold">Category</th>
                    <th className="px-3 py-2.5 font-bold">Method</th>
                    <th className="px-3 py-2.5 text-right font-bold">Amount</th>
                    <th className="w-10 px-3 py-2.5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-900/5">
                  {recent.map((t) => (
                    <tr key={t.id} className="transition hover:bg-ink-900/[0.02]">
                      <td className="whitespace-nowrap px-3 py-2.5 text-ink-700">{format(parseISO(t.date), 'dd MMM yy')}</td>
                      <td className="max-w-[16rem] truncate px-3 py-2.5 font-medium">{t.party || '—'}</td>
                      <td className="px-3 py-2.5 text-ink-600">{t.category}</td>
                      <td className="px-3 py-2.5 text-ink-600">{t.method || '—'}</td>
                      <td className={`whitespace-nowrap px-3 py-2.5 text-right font-semibold tabular-nums ${t.type === 'income' ? 'text-brand-700' : 'text-red-600'}`}>
                        {t.type === 'income' ? '+' : '−'}{money(t.amount)}
                      </td>
                      <td className="px-3 py-2.5">
                        <button
                          onClick={() => setConfirm(t)}
                          aria-label={`Delete entry from ${t.party || t.date}`}
                          className="grid h-8 w-8 place-items-center rounded-lg text-ink-400 transition hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="mt-3 flex items-center justify-between text-xs text-ink-500">
            <span>Showing {recent.length} of {transactions.length} transactions</span>
            <span className="inline-flex items-center gap-1">
              Full management in <ArrowRight className="h-3 w-3" /> Finance
            </span>
          </div>
        </Panel>
      </div>

      <ConfirmDialog
        open={Boolean(confirm)}
        onOpenChange={(v) => !v && setConfirm(null)}
        title="Delete this entry?"
        description={
          confirm
            ? `${confirm.date} · ${confirm.party} · ${money(confirm.amount)} will be removed from the books, along with the voucher it posted.`
            : ''
        }
        confirmLabel="Delete entry"
        destructive
        onConfirm={async () => {
          try {
            await remove.mutateAsync(confirm.id)
            toast('Entry deleted')
          } catch (err) {
            toast.error(err.message || 'Could not delete the entry')
          }
          setConfirm(null)
        }}
      />
    </div>
  )
}

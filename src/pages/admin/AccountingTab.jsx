import { Fragment, useMemo, useState } from 'react'
import { format, parseISO } from 'date-fns'
import { toast } from 'sonner'
import {
  Landmark, Plus, Trash2, Download, Search, Scale, BookOpen, FileText, Loader2, AlertTriangle,
} from 'lucide-react'

import {
  Card, Button, Input, Label, Badge, Tabs, TabsList, TabsTrigger, TabsContent, SelectField,
  Dialog, DialogContent, DialogFooter, EmptyState, Skeleton, StatCard, FieldError,
} from '../../components/admin/ui'
import { Panel, TF } from './components'
import {
  useAccounts, useCreateAccount, useUpdateAccount, useDeleteAccount,
  useVouchers, useCreateVoucher, useUpdateVoucher, useDeleteVoucher, useGrants,
} from './hooks'
import {
  ACCOUNT_GROUPS, FUNDS, seedAccounts as _unused,
} from '../../data/accounts'
import {
  accountTree, trialBalance, ledger, isBalanced, nextVoucherNo, voucherTotal,
  VOUCHER_TYPES, fyLabel,
} from '../../lib/accounting'
import { money, toCSV } from '../../lib/finance'
import { downloadFile } from '../../lib/utils'

const today = () => new Date().toISOString().slice(0, 10)
const fmtDate = (d) => (d ? format(parseISO(d), 'dd MMM yy') : '—')

const TONE = { Receipt: 'green', Payment: 'amber', Journal: 'slate', Contra: 'brand' }

/** A two-column financial statement: rows in, totals out. */
function Statement({ title, subtitle, sections, total, note, tone = 'brand' }) {
  return (
    <Card className="overflow-hidden">
      <div className="border-b border-ink-900/5 bg-ink-900/[0.02] px-5 py-3">
        <h3 className="font-display text-base font-bold">{title}</h3>
        {subtitle && <p className="text-xs text-ink-500">{subtitle}</p>}
      </div>
      <div className="grid gap-6 p-5 md:grid-cols-2">
        {sections.map((s) => (
          <div key={s.title}>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-ink-500">{s.title}</p>
            <table className="w-full text-sm">
              <tbody>
                {s.rows.map((r, i) => (
                  <tr key={i} className="border-b border-ink-900/5 last:border-0">
                    <td className="py-1.5 pr-2">{r.name}</td>
                    <td className="w-28 py-1.5 text-right font-medium tabular-nums">
                      {r.strong ? <strong>{money(r.amount)}</strong> : money(r.amount)}
                    </td>
                  </tr>
                ))}
                <tr>
                  <td className="pt-2 font-bold">{s.totalLabel || 'Total'}</td>
                  <td className="pt-2 text-right font-bold tabular-nums">{money(s.total)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        ))}
      </div>
      {total && (
        <div className={`flex items-center justify-between border-t border-ink-900/5 px-5 py-3 ${tone === 'green' ? 'bg-emerald-50/60' : 'bg-ink-900/[0.02]'}`}>
          <span className="font-display font-bold">{total.label}</span>
          <span className="font-display text-lg font-bold tabular-nums">{money(total.value)}</span>
        </div>
      )}
      {note && <p className="border-t border-ink-900/5 px-5 py-2 text-xs text-ink-500">{note}</p>}
    </Card>
  )
}

/* ======================================================================== *
 * Journal voucher form
 * ======================================================================== */
function VoucherForm({ open, onOpenChange, accounts }) {
  const create = useCreateVoucher()
  const [date, setDate] = useState(today())
  const [type, setType] = useState('Journal')
  const [narration, setNarration] = useState('')
  const [party, setParty] = useState('')
  const [fund, setFund] = useState('Unrestricted')
  const [lines, setLines] = useState([
    { account: '1002', debit: '', credit: '' },
    { account: '5101', debit: '', credit: '' },
  ])

  const setLine = (i, patch) => setLines((ls) => ls.map((l, j) => (j === i ? { ...l, ...patch } : l)))
  const debit = lines.reduce((s, l) => s + Number(l.debit || 0), 0)
  const credit = lines.reduce((s, l) => s + Number(l.credit || 0), 0)
  const balanced = Math.abs(debit - credit) < 0.01 && debit > 0

  const submit = async (e) => {
    e.preventDefault()
    if (!balanced) return toast.error(`Out by ${money(Math.abs(debit - credit))} — debits must equal credits`)
    try {
      await create.mutateAsync({
        no: nextVoucherNo([], type, date),
        date, type, narration, party, fund,
        method: '', reference: '', program: '', memberId: '',
        amount: debit,
        status: 'Posted',
        source: 'manual',
        lines: lines
          .filter((l) => Number(l.debit) || Number(l.credit))
          .map((l) => ({
            account: l.account, debit: Number(l.debit) || 0, credit: Number(l.credit) || 0, fund, program: '',
          })),
      })
      toast.success('Voucher posted')
      onOpenChange(false)
      setNarration(''); setParty('')
      setLines([{ account: '1002', debit: '', credit: '' }, { account: '5101', debit: '', credit: '' }])
    } catch (err) {
      toast.error(err.message || 'Could not post the voucher')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="New voucher" description="Every voucher must balance: total debits = total credits." style={{ '--dialog-w': '46rem' }}>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-4">
            <div>
              <Label>Date</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <SelectField label="Type" value={type} onChange={setType} options={VOUCHER_TYPES} />
            <SelectField label="Fund" value={fund} onChange={setFund} options={FUNDS} />
            <div>
              <Label>Party</Label>
              <Input value={party} onChange={(e) => setParty(e.target.value)} placeholder="Optional" />
            </div>
          </div>

          <div>
            <Label>Narration</Label>
            <Input value={narration} onChange={(e) => setNarration(e.target.value)} placeholder="What this entry records" />
          </div>

          <div className="rounded-xl border border-ink-900/10">
            <div className="grid grid-cols-[1fr_7rem_7rem_2.5rem] gap-2 border-b border-ink-900/10 bg-ink-900/[0.02] px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-ink-500">
              <span>Account</span><span className="text-right">Debit ₹</span><span className="text-right">Credit ₹</span><span />
            </div>
            <div className="divide-y divide-ink-900/5">
              {lines.map((l, i) => (
                <div key={i} className="grid grid-cols-[1fr_7rem_7rem_2.5rem] items-center gap-2 px-3 py-2">
                  <select
                    value={l.account}
                    onChange={(e) => setLine(i, { account: e.target.value })}
                    className="w-full rounded-lg border border-ink-900/10 bg-white px-2 py-1.5 text-sm"
                  >
                    {ACCOUNT_GROUPS.map((g) => (
                      <optgroup key={g} label={g}>
                        {accounts.filter((a) => a.group === g).map((a) => (
                          <option key={a.code} value={a.code}>{a.code} · {a.name}</option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                  <Input type="number" value={l.debit} onChange={(e) => setLine(i, { debit: e.target.value, credit: '' })} className="text-right" />
                  <Input type="number" value={l.credit} onChange={(e) => setLine(i, { credit: e.target.value, debit: '' })} className="text-right" />
                  <Button
                    type="button" variant="ghost" size="icon"
                    onClick={() => setLines((ls) => (ls.length > 2 ? ls.filter((_, j) => j !== i) : ls))}
                    aria-label={`Remove line ${i + 1}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between border-t border-ink-900/10 px-3 py-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => setLines((ls) => [...ls, { account: '5301', debit: '', credit: '' }])}>
                <Plus className="h-3.5 w-3.5" /> Add line
              </Button>
              <div className="flex items-center gap-4 text-sm font-bold tabular-nums">
                <span>Dr {money(debit)}</span>
                <span>Cr {money(credit)}</span>
                <Badge tone={balanced ? 'green' : 'amber'}>{balanced ? 'Balanced' : `Diff ${money(Math.abs(debit - credit))}`}</Badge>
              </div>
            </div>
          </div>

          <DialogFooter className="mx-[-1.25rem] mb-[-1rem]">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={create.isPending}>
              {create.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Post voucher
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/* ======================================================================== *
 * Account form (chart of accounts)
 * ======================================================================== */
function AccountForm({ open, onOpenChange, account }) {
  const create = useCreateAccount()
  const update = useUpdateAccount()
  const blank = { code: '', name: '', group: 'Expenditure', subGroup: '', opening: 0, openingType: 'Dr', note: '' }
  const [form, setForm] = useState(account || blank)
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))
  const isEdit = Boolean(account)

  const submit = async (e) => {
    e.preventDefault()
    if (!form.code || !form.name) return toast.error('Code and name are required')
    try {
      if (isEdit) await update.mutateAsync({ id: account.id, patch: form })
      else await create.mutateAsync({ ...form, active: true, system: false })
      toast.success(isEdit ? 'Account updated' : 'Account added')
      onOpenChange(false)
    } catch (err) {
      toast.error(err.message || 'Could not save the account')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={isEdit ? 'Edit account' : 'Add account'} description="Codes keep the ledger sortable — 1xxx assets · 2xxx liabilities · 3xxx funds · 4xxx income · 5xxx expenditure.">
        <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
          <TF label="Code" value={form.code} onChange={(v) => set('code', v)} placeholder="5105" required />
          <TF label="Name" value={form.name} onChange={(v) => set('name', v)} placeholder="Counselling costs" required />
          <div>
            <Label>Group</Label>
            <select value={form.group} onChange={(e) => set('group', e.target.value)} className="field mt-1">
              {ACCOUNT_GROUPS.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
          <TF label="Sub-group" value={form.subGroup} onChange={(v) => set('subGroup', v)} placeholder="Programme" />
          <TF label="Opening balance ₹" type="number" value={form.opening} onChange={(v) => set('opening', Number(v) || 0)} />
          <div>
            <Label>Opening is</Label>
            <select value={form.openingType} onChange={(e) => set('openingType', e.target.value)} className="field mt-1">
              <option value="Dr">Debit</option>
              <option value="Cr">Credit</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <TF label="Note" value={form.note} onChange={(v) => set('note', v)} />
          </div>
          <DialogFooter className="sm:col-span-2 mx-[-1.25rem] mb-[-1rem]">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit">Save account</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/* ======================================================================== *
 * Accounting tab
 * ======================================================================== */
export default function AccountingTab({ onJump }) {
  const { data: accounts = [], isLoading: loadingAccounts } = useAccounts()
  const { data: vouchers = [], isLoading: loadingVouchers } = useVouchers()
  const { data: grants = [] } = useGrants()
  const deleteVoucher = useDeleteVoucher()
  const deleteAccount = useDeleteAccount()

  const [tab, setTab] = useState('daybook')
  const [q, setQ] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [formOpen, setFormOpen] = useState(false)
  const [accountForm, setAccountForm] = useState({ open: false, account: null })
  const [detail, setDetail] = useState(null)
  const [ledgerCode, setLedgerCode] = useState('1002')
  const [asOn, setAsOn] = useState(today())

  const sorted = useMemo(
    () => [...vouchers].sort((a, b) => String(b.date).localeCompare(String(a.date)) || String(b.no).localeCompare(String(a.no))),
    [vouchers],
  )

  const filtered = useMemo(() => sorted.filter((v) => {
    if (typeFilter !== 'all' && v.type !== typeFilter) return false
    if (!q) return true
    const needle = q.toLowerCase()
    return [v.no, v.party, v.narration, v.reference, String(v.amount)]
      .filter(Boolean).some((f) => String(f).toLowerCase().includes(needle))
  }), [sorted, q, typeFilter])

  const tree = useMemo(() => accountTree(accounts), [accounts])
  const tb = useMemo(() => trialBalance(vouchers, accounts, asOn), [vouchers, accounts, asOn])
  const led = useMemo(() => ledger(vouchers, accounts, ledgerCode, { from: `${asOn.slice(0, 4)}-04-01`, to: asOn }), [vouchers, accounts, ledgerCode, asOn])

  const unbalanced = vouchers.filter((v) => !isBalanced(v))

  const exportDayBook = () => {
    const rows = filtered.map((v) => ({
      Date: v.date, 'Voucher No': v.no, Type: v.type, Party: v.party,
      Narration: v.narration, Fund: v.fund, Amount: voucherTotal(v), Status: v.status,
    }))
    const headers = ['Date', 'Voucher No', 'Type', 'Party', 'Narration', 'Fund', 'Amount', 'Status']
    downloadFile(`kso-day-book-${today()}.csv`, toCSV(rows, headers), 'text/csv')
    toast.success(`Exported ${rows.length} vouchers`)
  }

  const exportTrialBalance = () => {
    const rows = tb.rows.map((r) => ({ Code: r.code, Account: r.name, Group: r.group, Debit: r.debit, Credit: r.credit }))
    downloadFile(`kso-trial-balance-${asOn}.csv`, toCSV(rows, ['Code', 'Account', 'Group', 'Debit', 'Credit']), 'text/csv')
    toast.success('Trial balance exported')
  }

  if (loadingAccounts || loadingVouchers) {
    return <div className="space-y-3"><Skeleton className="h-24 w-full" /><Skeleton className="h-64 w-full" /></div>
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Accounts</h1>
          <p className="mt-0.5 text-sm text-ink-500">
            Double-entry books for FY {fyLabel(today())} — every transaction in the finance system posts a balanced voucher.
          </p>
        </div>
        <Button onClick={() => setFormOpen(true)}><Plus className="h-4 w-4" /> New voucher</Button>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Vouchers posted" value={vouchers.length} icon={FileText} hint={`${vouchers.filter((v) => v.status === 'Pending').length} pending`} />
        <StatCard label="Accounts in chart" value={accounts.length} icon={BookOpen} hint={`${ACCOUNT_GROUPS.length} groups`} tone="slate" />
        <StatCard label="Trial balance" value={tb.balanced ? 'Balanced' : 'Out'} icon={Scale} tone={tb.balanced ? 'green' : 'red'} hint={`${money(tb.totalDebit)} both sides`} />
        <StatCard label="Unbalanced vouchers" value={unbalanced.length} icon={AlertTriangle} tone={unbalanced.length ? 'red' : 'green'} hint={unbalanced.length ? 'Needs correction' : 'All entries balance'} />
      </div>

      {unbalanced.length > 0 && (
        <Card className="flex items-start gap-3 border-amber-200 bg-amber-50/70 p-4">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <div className="text-sm">
            <p className="font-bold text-amber-900">{unbalanced.length} voucher{unbalanced.length > 1 ? 's' : ''} do not balance.</p>
            <p className="text-amber-800">Open each one and correct the lines — statements stay wrong until they do.</p>
          </div>
        </Card>
      )}

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="daybook"><FileText className="h-3.5 w-3.5" /> Day book</TabsTrigger>
          <TabsTrigger value="coa"><BookOpen className="h-3.5 w-3.5" /> Chart of accounts</TabsTrigger>
          <TabsTrigger value="ledger"><Landmark className="h-3.5 w-3.5" /> Ledger</TabsTrigger>
          <TabsTrigger value="tb"><Scale className="h-3.5 w-3.5" /> Trial balance</TabsTrigger>
        </TabsList>

        {/* ------------------------------- day book ------------------------------ */}
        <TabsContent value="daybook">
          <Panel
            title="Day book" desc="Every voucher, newest first."
            actions={<Button variant="outline" size="sm" onClick={exportDayBook}><Download className="h-3.5 w-3.5" /> Export CSV</Button>}
          >
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <div className="relative flex-1 min-w-[12rem]">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-400" />
                <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search voucher, party, reference…" className="pl-9" />
              </div>
              <SelectField value={typeFilter} onChange={setTypeFilter} options={[{ value: 'all', label: 'All types' }, ...VOUCHER_TYPES]} className="w-40" />
            </div>

            {filtered.length === 0 ? (
              <EmptyState icon={FileText} title="No vouchers yet" text="Vouchers are created automatically when you record money in the finance system." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-sm">
                  <thead>
                    <tr className="border-b border-ink-900/8 text-left text-[11px] uppercase tracking-wide text-ink-500">
                      <th className="px-3 py-2.5 font-bold">Date</th>
                      <th className="px-3 py-2.5 font-bold">Voucher</th>
                      <th className="px-3 py-2.5 font-bold">Party / narration</th>
                      <th className="px-3 py-2.5 font-bold">Fund</th>
                      <th className="px-3 py-2.5 text-right font-bold">Amount</th>
                      <th className="px-3 py-2.5 font-bold">Status</th>
                      <th className="w-10 px-3 py-2.5" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink-900/5">
                    {filtered.map((v) => (
                      <tr key={v.id} className="transition hover:bg-ink-900/[0.02]">
                        <td className="px-3 py-2.5 text-ink-700">{fmtDate(v.date)}</td>
                        <td className="px-3 py-2.5">
                          <button onClick={() => setDetail(v)} className="text-left font-semibold hover:text-brand-700">{v.no}</button>
                          <span className="ml-2"><Badge tone={TONE[v.type] || 'slate'}>{v.type}</Badge></span>
                        </td>
                        <td className="max-w-[22rem] truncate px-3 py-2.5">
                          {v.party || '—'}
                          {v.narration && <span className="block truncate text-[11px] text-ink-500">{v.narration}</span>}
                        </td>
                        <td className="px-3 py-2.5 text-ink-700">{v.fund || '—'}</td>
                        <td className="px-3 py-2.5 text-right font-semibold tabular-nums">{money(voucherTotal(v))}</td>
                        <td className="px-3 py-2.5">
                          <Badge tone={v.status === 'Posted' ? 'green' : v.status === 'Cancelled' ? 'red' : 'amber'}>{v.status}</Badge>
                        </td>
                        <td className="px-3 py-2.5">
                          {v.source === 'manual' && (
                            <Button variant="ghost" size="icon" aria-label={`Delete ${v.no}`}
                              onClick={async () => { await deleteVoucher.mutateAsync(v.id); toast.success('Voucher deleted') }}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        </TabsContent>

        {/* -------------------------- chart of accounts -------------------------- */}
        <TabsContent value="coa">
          <Panel
            title="Chart of accounts"
            desc="Opening balances are what the Balance Sheet starts from. Numbers: 1xxx assets · 2xxx liabilities · 3xxx funds · 4xxx income · 5xxx expenditure."
            actions={<Button size="sm" onClick={() => setAccountForm({ open: true, account: null })}><Plus className="h-3.5 w-3.5" /> Add account</Button>}
          >
            <div className="space-y-6">
              {ACCOUNT_GROUPS.map((group) => (
                <div key={group}>
                  <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-ink-500">{group}</p>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[640px] text-sm">
                      <tbody className="divide-y divide-ink-900/5">
                        {(Object.entries(tree[group] || {})).map(([sub, rows]) => (
                          <Fragment key={sub}>
                            <tr key={sub}><td colSpan={4} className="pt-3 pb-1 text-xs font-bold text-ink-500">{sub}</td></tr>
                            {rows.map((a) => {
                              const bal = tb.rows.find((r) => r.code === a.code)
                              return (
                                <tr key={a.code} className="transition hover:bg-ink-900/[0.02]">
                                  <td className="w-20 py-1.5 font-mono text-xs text-ink-500">{a.code}</td>
                                  <td className="py-1.5">
                                    <button onClick={() => { setLedgerCode(a.code); setTab('ledger') }} className="text-left font-medium hover:text-brand-700">{a.name}</button>
                                    {a.note && <span className="block text-[11px] text-ink-500">{a.note}</span>}
                                  </td>
                                  <td className="w-32 py-1.5 text-right tabular-nums text-ink-600">
                                    {a.opening ? `${money(a.opening)} ${a.openingType}` : '—'}
                                  </td>
                                  <td className="w-32 py-1.5 text-right tabular-nums">
                                    {bal ? `${money(bal.amount)} ${bal.drCr}` : <span className="text-ink-400">nil</span>}
                                  </td>
                                  <td className="w-10 py-1.5">
                                    {!a.system && (
                                      <Button variant="ghost" size="icon" aria-label={`Delete ${a.name}`}
                                        onClick={async () => { await deleteAccount.mutateAsync(a.id); toast.success('Account deleted') }}>
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    )}
                                  </td>
                                </tr>
                              )
                            })}
                          </Fragment>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        </TabsContent>

        {/* -------------------------------- ledger ------------------------------- */}
        <TabsContent value="ledger">
          <Panel
            title="Ledger"
            desc="Every posting against one account, with a running balance."
            actions={(
              <div className="w-72">
                <Label>Account</Label>
                <select value={ledgerCode} onChange={(e) => setLedgerCode(e.target.value)} className="field mt-1">
                  {ACCOUNT_GROUPS.map((g) => (
                    <optgroup key={g} label={g}>
                      {accounts.filter((a) => a.group === g).map((a) => (
                        <option key={a.code} value={a.code}>{a.code} · {a.name}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>
            )}
          >
            {!led.account ? (
              <EmptyState icon={Landmark} title="Pick an account" text="Choose an account above to see its statement." />
            ) : led.entries.length === 0 ? (
              <EmptyState icon={Landmark} title="No postings in this period" text={`${led.account.name} has an opening balance of ${money(Math.abs(led.opening))} ${led.openingDrCr} but no movement yet.`} />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-sm">
                  <thead>
                    <tr className="border-b border-ink-900/8 text-left text-[11px] uppercase tracking-wide text-ink-500">
                      <th className="px-3 py-2.5 font-bold">Date</th>
                      <th className="px-3 py-2.5 font-bold">Voucher</th>
                      <th className="px-3 py-2.5 font-bold">Particulars</th>
                      <th className="px-3 py-2.5 text-right font-bold">Debit</th>
                      <th className="px-3 py-2.5 text-right font-bold">Credit</th>
                      <th className="px-3 py-2.5 text-right font-bold">Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink-900/5">
                    <tr className="bg-ink-900/[0.02]">
                      <td className="px-3 py-2" colSpan={3}><strong>Opening balance</strong></td>
                      <td className="px-3 py-2" />
                      <td className="px-3 py-2" />
                      <td className="px-3 py-2 text-right font-semibold tabular-nums">{money(Math.abs(led.opening))} {led.openingDrCr}</td>
                    </tr>
                    {led.entries.map((p, i) => (
                      <tr key={i} className="transition hover:bg-ink-900/[0.02]">
                        <td className="px-3 py-2 text-ink-700">{fmtDate(p.date)}</td>
                        <td className="px-3 py-2 font-mono text-xs">{p.voucherNo}</td>
                        <td className="max-w-[18rem] truncate px-3 py-2">{p.narration || p.type}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{p.debit ? money(p.debit) : ''}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{p.credit ? money(p.credit) : ''}</td>
                        <td className="px-3 py-2 text-right font-medium tabular-nums">{money(Math.abs(p.balance))} {p.drCr}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-ink-900/10 font-bold">
                      <td className="px-3 py-2.5" colSpan={3}>Totals &amp; closing balance</td>
                      <td className="px-3 py-2.5 text-right tabular-nums">{money(led.totalDebit)}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums">{money(led.totalCredit)}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums">{money(Math.abs(led.closing))} {led.closingDrCr}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </Panel>
        </TabsContent>

        {/* --------------------------- trial balance ---------------------------- */}
        <TabsContent value="tb">
          <Panel
            title="Trial balance"
            desc="Closing balances as on the date below. Debits must equal credits."
            actions={(
              <div className="flex items-end gap-2">
                <div>
                  <Label>As on</Label>
                  <Input type="date" value={asOn} onChange={(e) => setAsOn(e.target.value)} />
                </div>
                <Button variant="outline" size="sm" onClick={exportTrialBalance}><Download className="h-3.5 w-3.5" /> Export</Button>
              </div>
            )}
          >
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr className="border-b border-ink-900/8 text-left text-[11px] uppercase tracking-wide text-ink-500">
                    <th className="w-20 px-3 py-2.5 font-bold">Code</th>
                    <th className="px-3 py-2.5 font-bold">Account</th>
                    <th className="px-3 py-2.5 font-bold">Group</th>
                    <th className="w-36 px-3 py-2.5 text-right font-bold">Debit ₹</th>
                    <th className="w-36 px-3 py-2.5 text-right font-bold">Credit ₹</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-900/5">
                  {tb.rows.map((r) => (
                    <tr key={r.code} className="transition hover:bg-ink-900/[0.02]">
                      <td className="px-3 py-2 font-mono text-xs text-ink-500">{r.code}</td>
                      <td className="px-3 py-2">{r.name}</td>
                      <td className="px-3 py-2 text-ink-600">{r.group}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{r.drCr === 'Dr' ? money(r.amount) : ''}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{r.drCr === 'Cr' ? money(r.amount) : ''}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-ink-900/10 font-bold">
                    <td className="px-3 py-2.5" colSpan={3}>Totals</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{money(tb.totalDebit)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{money(tb.totalCredit)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
            <div className={`mt-3 rounded-xl px-4 py-2.5 text-sm font-semibold ${tb.balanced ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800'}`}>
              {tb.balanced
                ? `Balanced — ${money(tb.totalDebit)} on each side.`
                : `Out by ${money(Math.abs(tb.totalDebit - tb.totalCredit))} — check for a one-sided entry.`}
            </div>
          </Panel>
        </TabsContent>
      </Tabs>

      <VoucherForm open={formOpen} onOpenChange={setFormOpen} accounts={accounts} />
      <AccountForm open={accountForm.open} onOpenChange={(v) => setAccountForm({ open: v, account: null })} account={accountForm.account} />

      {/* voucher detail */}
      <Dialog open={Boolean(detail)} onOpenChange={(v) => !v && setDetail(null)}>
        <DialogContent
          title={detail?.no || ''}
          description={detail ? `${detail.type} · ${fmtDate(detail.date)} · ${detail.fund || 'no fund'}` : ''}
          style={{ '--dialog-w': '38rem' }}
        >
          {detail && (
            <div>
              <p className="text-sm text-ink-600">{detail.narration || detail.party || '—'}</p>
              <table className="mt-4 w-full text-sm">
                <thead>
                  <tr className="border-b border-ink-900/8 text-left text-[11px] uppercase tracking-wide text-ink-500">
                    <th className="py-2 font-bold">Account</th>
                    <th className="w-32 py-2 text-right font-bold">Debit</th>
                    <th className="w-32 py-2 text-right font-bold">Credit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-900/5">
                  {(detail.lines || []).map((l, i) => (
                    <tr key={i}>
                      <td className="py-2">{accounts.find((a) => a.code === l.account)?.name || l.account}</td>
                      <td className="py-2 text-right tabular-nums">{l.debit ? money(l.debit) : ''}</td>
                      <td className="py-2 text-right tabular-nums">{l.credit ? money(l.credit) : ''}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-ink-900/10 font-bold">
                    <td className="py-2">Total</td>
                    <td className="py-2 text-right tabular-nums">{money(detail.lines?.reduce((s, l) => s + Number(l.debit || 0), 0) || 0)}</td>
                    <td className="py-2 text-right tabular-nums">{money(detail.lines?.reduce((s, l) => s + Number(l.credit || 0), 0) || 0)}</td>
                  </tr>
                </tfoot>
              </table>
              {detail.source === 'transaction' && (
                <p className="mt-3 text-xs text-ink-500">
                  Posted automatically from the finance system. Edit the original transaction to change it.
                </p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

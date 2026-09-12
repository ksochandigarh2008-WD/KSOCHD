import { useMemo, useState } from 'react'
import { format, parseISO, subMonths, startOfMonth } from 'date-fns'
import { toast } from 'sonner'
import {
  FileSpreadsheet, Download, Receipt as ReceiptIcon, Trash2, Plus, Landmark,
  TrendingUp, Scale, Globe, HandCoins, FileCheck2, FileDown, Pencil,
} from 'lucide-react'

import {
  Card, Button, Input, Label, Badge, Tabs, TabsList, TabsTrigger, TabsContent, SelectField,
  Dialog, DialogContent, DialogFooter, EmptyState, Skeleton, StatCard, ConfirmDialog,
} from '../../components/admin/ui'
import { Panel, TF } from './components'
import {
  useAccounts, useVouchers, useGrants, useDeleteGrant,
  useReceipts, useCreateReceipt, useDeleteReceipt,
} from './hooks'
import { FUNDS, FUND_LABELS } from '../../data/accounts'
import {
  receiptsPayments, incomeExpenditure, balanceSheet, fundSummary, fcraRegister,
  grantUtilisation, unreceiptedDonations, nextReceiptNo, fyLabel, fyStart, voucherTotal,
} from '../../lib/accounting'
import { money, toCSV } from '../../lib/finance'
import { downloadFile } from '../../lib/utils'
import { useSite } from '../../store/useSite'
import {
  build80gReceipt, buildUtilisationCertificate, downloadReceipt, downloadUtilisationCertificate,
} from '../../lib/documents'
import GrantForm from './finance/GrantForm'

const today = () => new Date().toISOString().slice(0, 10)
const fmtDate = (d) => (d ? format(parseISO(d), 'dd MMM yyyy') : '—')
const iso = (d) => format(d, 'yyyy-MM-dd')

const PERIODS = [
  { value: 'fy', label: 'This financial year' },
  { value: 'quarter', label: 'Last 3 months' },
  { value: 'half', label: 'Last 6 months' },
  { value: 'year', label: 'Last 12 months' },
  { value: 'month', label: 'This month' },
]

const rangeFor = (key) => {
  const now = new Date()
  if (key === 'fy') return { from: fyStart(now), to: iso(now) }
  if (key === 'month') return { from: iso(startOfMonth(now)), to: iso(now) }
  const months = { quarter: 3, half: 6, year: 12 }[key] || 6
  return { from: iso(subMonths(now, months)), to: iso(now) }
}

/** A classic two-sided statement: left column of heads, right column of heads. */
function Statement({ title, subtitle, left, right, footer, note, tone = 'brand' }) {
  const side = (s) => (
    <div>
      <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-ink-500">{s.title}</p>
      <table className="w-full text-sm">
        <tbody>
          {s.rows.length === 0 && (
            <tr><td className="py-1.5 text-ink-400">Nothing recorded</td></tr>
          )}
          {s.rows.map((r, i) => (
            <tr key={i} className="border-b border-ink-900/5 last:border-0">
              <td className="py-1.5 pr-2">
                {r.name}
                {r.hint && <span className="block text-[11px] text-ink-500">{r.hint}</span>}
              </td>
              <td className="w-32 py-1.5 text-right font-medium tabular-nums">{money(r.amount)}</td>
            </tr>
          ))}
          <tr>
            <td className="pt-2 font-bold">{s.totalLabel}</td>
            <td className="pt-2 text-right font-bold tabular-nums">{money(s.total)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  )
  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-ink-900/5 bg-ink-900/[0.02] px-5 py-3">
        <div>
          <h3 className="font-display text-base font-bold">{title}</h3>
          {subtitle && <p className="text-xs text-ink-500">{subtitle}</p>}
        </div>
        {footer}
      </div>
      <div className="grid gap-8 p-5 md:grid-cols-2">{side(left)}{side(right)}</div>
      {note && (
        <div className={`border-t border-ink-900/5 px-5 py-2.5 text-sm font-semibold ${tone === 'green' ? 'bg-emerald-50 text-emerald-800' : tone === 'red' ? 'bg-red-50 text-red-800' : 'bg-ink-900/[0.02]'}`}>
          {note}
        </div>
      )}
    </Card>
  )
}

/* ======================================================================== *
 * 80G receipt
 * ======================================================================== */
function ReceiptDialog({ open, onOpenChange, voucher, receipts }) {
  const create = useCreateReceipt()
  const [pan, setPan] = useState('')
  const [address, setAddress] = useState('')
  const [date, setDate] = useState(today())

  const submit = async (e) => {
    e.preventDefault()
    if (!voucher) return
    if (pan && !/^[A-Z]{5}[0-9]{4}[A-Z]$/i.test(pan.trim())) {
      return toast.error('PAN should look like ABCDE1234F')
    }
    try {
      await create.mutateAsync({
        no: nextReceiptNo(receipts, date),
        date,
        voucherId: voucher.id,
        donor: voucher.party || 'Anonymous donor',
        amount: voucherTotal(voucher),
        method: voucher.method || '',
        pan: pan.trim().toUpperCase(),
        address: address.trim(),
        narration: voucher.narration || '',
      })
      toast.success('Receipt issued')
      onOpenChange(false)
      setPan(''); setAddress('')
    } catch (err) {
      toast.error(err.message || 'Could not issue the receipt')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="Issue 80G receipt" description="Numbered automatically in the KSO/80G/year series." style={{ '--dialog-w': '34rem' }}>
        <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
          <TF label="Donor" value={voucher?.party || ''} onChange={() => {}} />
          <TF label="Amount ₹" value={voucher ? String(voucherTotal(voucher)) : ''} onChange={() => {}} />
          <div>
            <Label>Receipt date</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1" />
          </div>
          <TF label="PAN (optional)" value={pan} onChange={setPan} placeholder="ABCDE1234F" />
          <div className="sm:col-span-2">
            <TF label="Address (optional)" value={address} onChange={setAddress} placeholder="Needed for donations of ₹2,000 or more" />
          </div>
          <DialogFooter className="sm:col-span-2 mx-[-1.25rem] mb-[-1rem]">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={create.isPending}>Issue receipt</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/* ======================================================================== *
 * Reports tab
 * ======================================================================== */
export default function ReportsTab() {
  const { data: accounts = [], isLoading: loadingAccounts } = useAccounts()
  const { data: vouchers = [], isLoading: loadingVouchers } = useVouchers()
  const { data: grants = [] } = useGrants()
  const { data: receipts = [] } = useReceipts()
  const deleteReceipt = useDeleteReceipt()
  const settings = useSite((s) => s.settings)
  const org = useSite((s) => s.content.org) || {}
  const programs = useSite((s) => s.content.programs) || []
  const deleteGrant = useDeleteGrant()
  const [grantForm, setGrantForm] = useState({ open: false, grant: null })
  const [confirmGrant, setConfirmGrant] = useState(null)
  const [confirmReceipt, setConfirmReceipt] = useState(null)

  // Statutory documents are built from the books, never from a free-text total.
  const onReceiptPdf = async (r) => {
    const model = build80gReceipt({ receipt: r, settings, org })
    try {
      await downloadReceipt(model)
      if (model.missing.length) {
        toast.success(`${model.no} downloaded — ${model.missing.length} compliance detail(s) still blank`)
      } else toast.success(`Receipt ${model.no} downloaded`)
    } catch (e) { toast.error(`Could not build the PDF: ${e.message}`) }
  }

  const onUcPdf = async (g) => {
    const model = buildUtilisationCertificate({ grant: g, settings, org })
    try {
      await downloadUtilisationCertificate(model)
      if (model.missing.length) {
        toast.success(`Certificate downloaded — ${model.missing.length} compliance detail(s) still blank`)
      } else toast.success('Utilisation certificate downloaded')
    } catch (e) { toast.error(`Could not build the PDF: ${e.message}`) }
  }

  const [tab, setTab] = useState('randp')
  const [period, setPeriod] = useState('fy')
  const [custom, setCustom] = useState(rangeFor('fy'))
  const [usingCustom, setUsingCustom] = useState(false)
  const [asOn, setAsOn] = useState(today())
  const [receiptFor, setReceiptFor] = useState(null)

  const range = useMemo(() => (usingCustom ? custom : rangeFor(period)), [usingCustom, custom, period])

  const rp = useMemo(() => receiptsPayments(vouchers, accounts, range), [vouchers, accounts, range])
  const ie = useMemo(() => incomeExpenditure(vouchers, accounts, range), [vouchers, accounts, range])
  const bs = useMemo(() => balanceSheet(vouchers, accounts, asOn), [vouchers, accounts, asOn])
  const funds = useMemo(() => fundSummary(vouchers, accounts, range), [vouchers, accounts, range])
  const fcra = useMemo(() => fcraRegister(vouchers), [vouchers])
  const grantRows = useMemo(() => grantUtilisation(vouchers, grants, accounts, range), [vouchers, grants, accounts, range])
  const pending = useMemo(() => unreceiptedDonations(vouchers, receipts), [vouchers, receipts])

  const csvDownload = (name, rows, headers) => {
    downloadFile(`${name}-${today()}.csv`, toCSV(rows, headers), 'text/csv')
    toast.success('Exported')
  }

  const exportBtn = (name, rows, headers) => (
    <Button variant="outline" size="sm" onClick={() => csvDownload(name, rows, headers)}>
      <Download className="h-3.5 w-3.5" /> Export CSV
    </Button>
  )

  if (loadingAccounts || loadingVouchers) {
    return <div className="space-y-3"><Skeleton className="h-24 w-full" /><Skeleton className="h-64 w-full" /></div>
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Financial reports</h1>
          <p className="mt-0.5 text-sm text-ink-500">
            Statutory statements for FY {fyLabel(today())}, plus the fund, FCRA, 80G and grant registers.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <SelectField
            value={usingCustom ? 'custom' : period}
            onChange={(v) => { if (v === 'custom') setUsingCustom(true); else { setUsingCustom(false); setPeriod(v) } }}
            options={[...PERIODS, { value: 'custom', label: 'Custom range' }]}
            className="w-52"
          />
        </div>
      </header>

      {usingCustom && (
        <Card className="flex flex-wrap items-end gap-3 p-4">
          <div>
            <Label>From</Label>
            <Input type="date" value={custom.from} onChange={(e) => setCustom((c) => ({ ...c, from: e.target.value }))} className="mt-1" />
          </div>
          <div>
            <Label>To</Label>
            <Input type="date" value={custom.to} onChange={(e) => setCustom((c) => ({ ...c, to: e.target.value }))} className="mt-1" />
          </div>
        </Card>
      )}

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="randp"><HandCoins className="h-3.5 w-3.5" /> Receipts &amp; payments</TabsTrigger>
          <TabsTrigger value="ie"><TrendingUp className="h-3.5 w-3.5" /> Income &amp; expenditure</TabsTrigger>
          <TabsTrigger value="bs"><Scale className="h-3.5 w-3.5" /> Balance sheet</TabsTrigger>
          <TabsTrigger value="funds"><Landmark className="h-3.5 w-3.5" /> Funds &amp; FCRA</TabsTrigger>
          <TabsTrigger value="80g"><ReceiptIcon className="h-3.5 w-3.5" /> 80G receipts</TabsTrigger>
          <TabsTrigger value="grants"><FileCheck2 className="h-3.5 w-3.5" /> Grants &amp; CSR</TabsTrigger>
        </TabsList>

        {/* --------------------------- receipts & payments ---------------------- */}
        <TabsContent value="randp">
          <Statement
            title="Receipts and Payments account"
            subtitle={`Cash and bank only · ${fmtDate(range.from)} to ${fmtDate(range.to)}`}
            footer={exportBtn('kso-receipts-payments',
              [
                ...rp.receipts.map((r) => ({ Head: r.name, Receipts: r.amount, Payments: '' })),
                ...rp.payments.map((p) => ({ Head: p.name, Receipts: '', Payments: p.amount })),
              ],
              ['Head', 'Receipts', 'Payments'])}
            left={{
              title: 'Receipts', totalLabel: 'Total receipts',
              total: rp.totalReceipts,
              rows: [
                { name: 'Opening cash & bank balance', amount: rp.opening, hint: 'Cash in hand + bank accounts' },
                ...rp.receipts.map((r) => ({ name: r.name, amount: r.amount })),
              ],
            }}
            right={{
              title: 'Payments', totalLabel: 'Total payments',
              total: rp.totalPayments,
              rows: [
                { name: 'Closing cash & bank balance', amount: rp.closing },
                ...rp.payments.map((p) => ({ name: p.name, amount: p.amount })),
              ],
            }}
            note={`Opening ${money(rp.opening)} + receipts ${money(rp.totalReceipts)} − payments ${money(rp.totalPayments)} = closing ${money(rp.closing)}${rp.verified ? ' · agrees with the cash and bank ledger' : ' · does NOT agree with the ledger — check for a one-sided entry'}`}
            tone={rp.verified ? 'green' : 'red'}
          />
        </TabsContent>

        {/* ------------------------- income & expenditure ----------------------- */}
        <TabsContent value="ie">
          <Statement
            title="Income and Expenditure account"
            subtitle={`${fmtDate(range.from)} to ${fmtDate(range.to)}`}
            footer={exportBtn('kso-income-expenditure',
              [
                ...ie.income.map((r) => ({ Head: r.name, Income: r.net, Expenditure: '' })),
                ...ie.expenditure.map((r) => ({ Head: r.name, Income: '', Expenditure: r.net })),
              ],
              ['Head', 'Income', 'Expenditure'])}
            left={{
              title: 'Expenditure', totalLabel: 'Total expenditure',
              total: ie.totalExpenditure,
              rows: ie.expenditure.map((r) => ({ name: r.name, amount: r.amount, hint: r.subGroup })),
            }}
            right={{
              title: 'Income', totalLabel: 'Total income',
              total: ie.totalIncome,
              rows: ie.income.map((r) => ({ name: r.name, amount: r.amount, hint: r.subGroup })),
            }}
            note={`${ie.surplusLabel} of ${money(Math.abs(ie.surplus))} — ${ie.surplus >= 0 ? 'income exceeded expenditure' : 'expenditure exceeded income'} for the period.`}
            tone={ie.surplus >= 0 ? 'green' : 'red'}
          />
        </TabsContent>

        {/* ------------------------------ balance sheet ------------------------ */}
        <TabsContent value="bs">
          <div className="mb-4 flex flex-wrap items-end gap-3">
            <div>
              <Label>As on</Label>
              <Input type="date" value={asOn} onChange={(e) => setAsOn(e.target.value)} className="mt-1" />
            </div>
            <Button variant="outline" size="sm" onClick={() => csvDownload('kso-balance-sheet',
              [
                ...bs.assets.map((r) => ({ Section: 'Assets', Head: r.name, Amount: r.amount })),
                ...bs.liabilities.map((r) => ({ Section: 'Liabilities', Head: r.name, Amount: r.amount })),
                ...bs.funds.map((r) => ({ Section: 'Funds', Head: r.name, Amount: r.amount })),
              ],
              ['Section', 'Head', 'Amount'])}>
              <Download className="h-3.5 w-3.5" /> Export CSV
            </Button>
          </div>

          <Statement
            title="Balance sheet"
            subtitle={`As on ${fmtDate(asOn)} · FY ${fyLabel(asOn)}`}
            left={{
              title: 'Funds & liabilities', totalLabel: 'Total funds & liabilities',
              total: bs.totalLiabilities + bs.totalFunds,
              rows: [
                ...bs.funds.map((r) => ({ name: r.name, amount: r.amount, hint: FUND_LABELS[r.subGroup] || r.subGroup })),
                ...bs.liabilities.map((r) => ({ name: r.name, amount: r.amount })),
              ],
            }}
            right={{
              title: 'Assets', totalLabel: 'Total assets',
              total: bs.totalAssets,
              rows: bs.assets.map((r) => ({ name: r.name, amount: r.amount, hint: r.subGroup })),
            }}
            note={bs.balanced
              ? `Balanced — assets ${money(bs.totalAssets)} equal funds and liabilities ${money(bs.totalLiabilities + bs.totalFunds)}. Includes the year's ${bs.surplusLabel.toLowerCase()} of ${money(Math.abs(bs.surplus))}.`
              : `Out by ${money(Math.abs(bs.difference))} — the books do not balance as on this date.`}
            tone={bs.balanced ? 'green' : 'red'}
          />
        </TabsContent>

        {/* ------------------------------ funds & FCRA ------------------------- */}
        <TabsContent value="funds">
          <div className="grid gap-4">
            <Panel
              title="Fund movement"
              desc="Opening, receipts, spend and closing for each fund."
              actions={exportBtn('kso-funds', funds.map((f) => ({
                Fund: f.fund, Opening: f.opening, Receipts: f.receipts, Payments: f.payments, Closing: f.closing,
              })), ['Fund', 'Opening', 'Receipts', 'Payments', 'Closing'])}
            >
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-sm">
                  <thead>
                    <tr className="border-b border-ink-900/8 text-left text-[11px] uppercase tracking-wide text-ink-500">
                      <th className="px-3 py-2.5 font-bold">Fund</th>
                      <th className="px-3 py-2.5 text-right font-bold">Opening</th>
                      <th className="px-3 py-2.5 text-right font-bold">Receipts</th>
                      <th className="px-3 py-2.5 text-right font-bold">Spent</th>
                      <th className="px-3 py-2.5 text-right font-bold">Closing</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink-900/5">
                    {funds.map((f) => (
                      <tr key={f.fund} className="transition hover:bg-ink-900/[0.02]">
                        <td className="px-3 py-2.5">
                          <span className="font-medium">{f.fund}</span>
                          <span className="block text-[11px] text-ink-500">{FUND_LABELS[f.fund]}</span>
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums">{money(f.opening)}</td>
                        <td className="px-3 py-2.5 text-right tabular-nums text-emerald-700">{money(f.receipts)}</td>
                        <td className="px-3 py-2.5 text-right tabular-nums text-amber-700">{money(f.payments)}</td>
                        <td className="px-3 py-2.5 text-right font-semibold tabular-nums">{money(f.closing)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>

            <Panel
              title="FCRA register"
              desc="Foreign contribution must be received in a designated account and reported separately."
              actions={exportBtn('kso-fcra', fcra.map((v) => ({
                Date: v.date, Voucher: v.no, Party: v.party, Type: v.type, Amount: voucherTotal(v), Narration: v.narration,
              })), ['Date', 'Voucher', 'Party', 'Type', 'Amount', 'Narration'])}
            >
              {fcra.length === 0 ? (
                <EmptyState icon={Globe} title="No foreign contribution recorded" text="Tag a transaction's fund as FCRA and it appears here automatically." />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[640px] text-sm">
                    <thead>
                      <tr className="border-b border-ink-900/8 text-left text-[11px] uppercase tracking-wide text-ink-500">
                        <th className="px-3 py-2.5 font-bold">Date</th>
                        <th className="px-3 py-2.5 font-bold">Voucher</th>
                        <th className="px-3 py-2.5 font-bold">Party</th>
                        <th className="px-3 py-2.5 font-bold">Narration</th>
                        <th className="px-3 py-2.5 text-right font-bold">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-ink-900/5">
                      {fcra.map((v) => (
                        <tr key={v.id} className="transition hover:bg-ink-900/[0.02]">
                          <td className="px-3 py-2.5 text-ink-700">{fmtDate(v.date)}</td>
                          <td className="px-3 py-2.5 font-mono text-xs">{v.no}</td>
                          <td className="px-3 py-2.5">{v.party || '—'}</td>
                          <td className="max-w-[18rem] truncate px-3 py-2.5 text-ink-600">{v.narration || '—'}</td>
                          <td className={`px-3 py-2.5 text-right font-semibold tabular-nums ${v.type === 'Receipt' ? 'text-emerald-700' : ''}`}>
                            {v.type === 'Receipt' ? '+' : '−'}{money(voucherTotal(v))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Panel>
          </div>
        </TabsContent>

        {/* -------------------------------- 80G -------------------------------- */}
        <TabsContent value="80g">
          <div className="grid gap-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <StatCard label="Receipts issued" value={receipts.length} icon={ReceiptIcon} hint={`FY ${fyLabel(today())} series`} />
              <StatCard label="Donations awaiting receipt" value={pending.length} icon={FileCheck2} tone={pending.length ? 'amber' : 'green'} hint="Issue to stay compliant" />
              <StatCard label="Receipted value" value={money(receipts.reduce((s, r) => s + Number(r.amount || 0), 0))} icon={TrendingUp} tone="slate" />
            </div>

            <Panel
              title="Donations awaiting a receipt"
              desc="Every donation recorded against an individual or corporate head."
              actions={exportBtn('kso-80g-register', receipts.map((r) => ({
                'Receipt No': r.no, Date: r.date, Donor: r.donor, PAN: r.pan, Amount: r.amount, Method: r.method,
              })), ['Receipt No', 'Date', 'Donor', 'PAN', 'Amount', 'Method'])}
            >
              {pending.length === 0 ? (
                <EmptyState icon={ReceiptIcon} title="Every donation has a receipt" text="New donations will appear here as they arrive." />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[680px] text-sm">
                    <thead>
                      <tr className="border-b border-ink-900/8 text-left text-[11px] uppercase tracking-wide text-ink-500">
                        <th className="px-3 py-2.5 font-bold">Date</th>
                        <th className="px-3 py-2.5 font-bold">Donor</th>
                        <th className="px-3 py-2.5 font-bold">Mode</th>
                        <th className="px-3 py-2.5 text-right font-bold">Amount</th>
                        <th className="w-32 px-3 py-2.5" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-ink-900/5">
                      {pending.slice(0, 20).map((v) => (
                        <tr key={v.id} className="transition hover:bg-ink-900/[0.02]">
                          <td className="px-3 py-2.5 text-ink-700">{fmtDate(v.date)}</td>
                          <td className="px-3 py-2.5 font-medium">{v.party || 'Anonymous donor'}</td>
                          <td className="px-3 py-2.5 text-ink-600">{v.method || '—'}</td>
                          <td className="px-3 py-2.5 text-right font-semibold tabular-nums">{money(voucherTotal(v))}</td>
                          <td className="px-3 py-2.5 text-right">
                            <Button size="sm" variant="outline" onClick={() => setReceiptFor(v)}>
                              <Plus className="h-3.5 w-3.5" /> Issue
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Panel>

            <Panel title="Receipt register" desc="Numbered in sequence — the number is permanent, so delete only mistakes.">
              {receipts.length === 0 ? (
                <EmptyState icon={FileSpreadsheet} title="No receipts issued yet" text="Issue one from the list above." />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[680px] text-sm">
                    <thead>
                      <tr className="border-b border-ink-900/8 text-left text-[11px] uppercase tracking-wide text-ink-500">
                        <th className="px-3 py-2.5 font-bold">Receipt no</th>
                        <th className="px-3 py-2.5 font-bold">Date</th>
                        <th className="px-3 py-2.5 font-bold">Donor</th>
                        <th className="px-3 py-2.5 font-bold">PAN</th>
                        <th className="px-3 py-2.5 text-right font-bold">Amount</th>
                        <th className="w-20 px-3 py-2.5" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-ink-900/5">
                      {[...receipts].sort((a, b) => String(b.no).localeCompare(String(a.no))).map((r) => (
                        <tr key={r.id} className="transition hover:bg-ink-900/[0.02]">
                          <td className="px-3 py-2.5 font-mono text-xs">{r.no}</td>
                          <td className="px-3 py-2.5 text-ink-700">{fmtDate(r.date)}</td>
                          <td className="px-3 py-2.5 font-medium">{r.donor}</td>
                          <td className="px-3 py-2.5 font-mono text-xs text-ink-600">{r.pan || '—'}</td>
                          <td className="px-3 py-2.5 text-right font-semibold tabular-nums">{money(r.amount)}</td>
                          <td className="px-3 py-2.5">
                            <div className="flex items-center gap-1">
                              <Button variant="ghost" size="icon" aria-label={`Download receipt ${r.no}`} onClick={() => onReceiptPdf(r)}>
                                <FileDown className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" aria-label={`Delete receipt ${r.no}`}
                                onClick={() => setConfirmReceipt(r)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Panel>
          </div>
        </TabsContent>

        {/* ------------------------------- grants ------------------------------- */}
        <TabsContent value="grants">
          <Panel
            title="Grant &amp; CSR utilisation"
            desc="Sanctioned versus received, and how much has been spent for the purpose. Download a GFR 19-A utilisation certificate per grant."
            actions={
              <>
                <Button size="sm" onClick={() => setGrantForm({ open: true, grant: null })}>
                  <Plus className="h-3.5 w-3.5" /> Record grant
                </Button>
                {exportBtn('kso-grants', grantRows.map((g) => ({
              Donor: g.donor, Purpose: g.purpose, 'Sanction No': g.sanctionNo,
              Sanctioned: g.sanctioned, Received: g.received, Utilised: g.utilised, Balance: g.balance, 'Utilised %': g.utilisation,
            })), ['Donor', 'Purpose', 'Sanction No', 'Sanctioned', 'Received', 'Utilised', 'Balance', 'Utilised %'])}
              </>
            }
          >
            {grantRows.length === 0 ? (
              <EmptyState
                icon={FileCheck2}
                title="No grants recorded"
                text="Record a grant or CSR commitment to track its utilisation and issue certificates."
                action={<Button onClick={() => setGrantForm({ open: true, grant: null })}><Plus className="h-4 w-4" /> Record grant</Button>}
              />
            ) : (
              <div className="space-y-4">
                {grantRows.map((g) => (
                  <Card key={g.id} className="p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-display font-bold">{g.donor}</p>
                        <p className="text-sm text-ink-600">{g.purpose}</p>
                        <p className="mt-0.5 text-xs text-ink-500">
                          Sanction {g.sanctionNo || '—'} · {g.fund} fund · {fmtDate(g.startDate)} → {fmtDate(g.endDate)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-display text-lg font-bold tabular-nums">{money(g.utilised)}</p>
                        <p className="text-xs text-ink-500">of {money(g.received)} received</p>
                        <Badge tone={g.status === 'Closed' ? 'slate' : 'brand'}>{g.status}</Badge>
                        <div className="mt-2 flex flex-wrap justify-end gap-1.5">
                          <Button size="sm" variant="outline" onClick={() => onUcPdf(g)}>
                            <FileDown className="h-3.5 w-3.5" /> Utilisation certificate
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setGrantForm({ open: true, grant: g })}>
                            <Pencil className="h-3.5 w-3.5" /> Edit
                          </Button>
                          <Button size="sm" variant="ghost" aria-label={`Delete grant ${g.donor}`} onClick={() => setConfirmGrant(g)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-ink-900/8">
                      <div className="h-full rounded-full bg-brand-500" style={{ width: `${Math.min(100, g.utilisation)}%` }} />
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-ink-600 sm:grid-cols-4">
                      <span>Sanctioned <strong className="tabular-nums">{money(g.sanctioned)}</strong></span>
                      <span>Received <strong className="tabular-nums">{money(g.received)}</strong></span>
                      <span>Utilised <strong className="tabular-nums">{money(g.utilised)}</strong></span>
                      <span>Balance <strong className="tabular-nums">{money(g.balance)}</strong> · {g.utilisation}%</span>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </Panel>
        </TabsContent>
      </Tabs>

      <ReceiptDialog
        open={Boolean(receiptFor)}
        onOpenChange={(v) => !v && setReceiptFor(null)}
        voucher={receiptFor}
        receipts={receipts}
      />

      <GrantForm
        open={grantForm.open}
        onOpenChange={(v) => setGrantForm({ open: v, grant: v ? grantForm.grant : null })}
        grant={grantForm.grant}
        programs={programs}
        onSaved={() => setGrantForm({ open: false, grant: null })}
      />
      <ConfirmDialog
        open={Boolean(confirmReceipt)}
        onOpenChange={(v) => !v && setConfirmReceipt(null)}
        title={`Delete receipt ${confirmReceipt?.no}?`}
        description={`${confirmReceipt?.donor || 'This donor'} was issued this number, and a receipt number is never reissued. The donation stays in the books and can be receipted again with a new number.`}
        confirmLabel="Delete receipt"
        destructive
        onConfirm={async () => {
          try { await deleteReceipt.mutateAsync(confirmReceipt.id); toast.success('Receipt deleted') }
          catch (e) { toast.error(e.message) }
          setConfirmReceipt(null)
        }}
      />
      <ConfirmDialog
        open={Boolean(confirmGrant)}
        onOpenChange={(v) => !v && setConfirmGrant(null)}
        title={`Delete the ${confirmGrant?.donor} grant?`}
        description={
          (() => {
            const n = vouchers.filter((v) => v.grantId === confirmGrant?.id).length
            if (!n) return 'The grant record goes. No vouchers are tagged to it, so the books are unaffected.'
            return `The grant record goes. The ${n} voucher${n === 1 ? '' : 's'} posted against it stay in the books, but will lose their link to this grant — their spend can no longer be reported on this funder's utilisation certificate.`
          })()
        }
        confirmLabel="Delete grant"
        destructive
        onConfirm={async () => {
          try { await deleteGrant.mutateAsync(confirmGrant.id); toast.success('Grant deleted') }
          catch (e) { toast.error(e.message) }
          setConfirmGrant(null)
        }}
      />
    </div>
  )
}

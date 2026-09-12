import { Search, Filter, Plus, Receipt, MoreHorizontal, Pencil, Trash2, BadgeCheck } from 'lucide-react'
import {
  Card, Button, Input, Badge, SelectField, TabsContent, EmptyState, Skeleton,
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator,
} from '../../../components/admin/ui'
import { TXN_STATUS } from '../../../data/seedData'
import { sumBy, money } from '../../../lib/finance'
import { formatDate, cn } from '../../../lib/utils'

/**
 * Transactions tab: filters plus the ledger table. Owns no data — the parent
 * fetches, filters and mutates; this only renders and reports intent.
 */
export default function TransactionsPanel({
  transactions, filtered, isLoading, programs, programLabel,
  q, onQuery, typeFilter, onType, catFilter, onCategory, progFilter, onProgram,
  statusFilter, onStatus, onClearFilters, onEdit, onDelete, onStatusChange, onAdd,
}) {
  return (
        <TabsContent value="ledger">
          <Card>
            <div className="flex flex-wrap items-center gap-2 border-b border-ink-900/5 p-3.5">
              <div className="relative min-w-[200px] flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-500" />
                <Input className="pl-9" value={q} onChange={(e) => onQuery(e.target.value)} placeholder="Search donor, vendor, reference…" />
              </div>
              <div className="w-[150px]">
                <SelectField value={typeFilter} onChange={onType} options={[{ value: 'all', label: 'All types' }, { value: 'income', label: 'Income' }, { value: 'expense', label: 'Expense' }]} />
              </div>
              <div className="w-[170px]">
                <SelectField value={catFilter} onChange={onCategory} options={[{ value: 'all', label: 'All categories' }, ...[...new Set(transactions.map((t) => t.category))]]} />
              </div>
              <div className="w-[150px]">
                <SelectField value={progFilter} onChange={onProgram} options={[{ value: 'all', label: 'All programmes' }, ...programs.map((p) => ({ value: p.slug, label: p.title }))]} />
              </div>
              <div className="w-[140px]">
                <SelectField value={statusFilter} onChange={onStatus} options={[{ value: 'all', label: 'Any status' }, ...TXN_STATUS]} />
              </div>
              {(typeFilter !== 'all' || catFilter !== 'all' || progFilter !== 'all' || statusFilter !== 'all' || q) && (
                <Button variant="ghost" size="sm" onClick={onClearFilters}><Filter className="h-3.5 w-3.5" /> Clear</Button>
              )}
            </div>

            {isLoading ? (
              <div className="space-y-2 p-5">{[0, 1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
            ) : filtered.length === 0 ? (
              <div className="p-5">
                <EmptyState
                  icon={Receipt}
                  title="No transactions match"
                  text="Adjust the period or filters, or record a new entry."
                  action={<Button onClick={onAdd}><Plus className="h-4 w-4" /> Record entry</Button>}
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[880px] text-sm">
                  <thead>
                    <tr className="border-b border-ink-900/8 text-left text-[11px] uppercase tracking-wide text-ink-500">
                      <th className="px-4 py-2.5 font-bold">Date</th>
                      <th className="px-3 py-2.5 font-bold">Party</th>
                      <th className="px-3 py-2.5 font-bold">Category</th>
                      <th className="px-3 py-2.5 font-bold">Programme</th>
                      <th className="px-3 py-2.5 font-bold">Method</th>
                      <th className="px-3 py-2.5 text-right font-bold">Amount</th>
                      <th className="px-3 py-2.5 font-bold">Status</th>
                      <th className="w-10 px-3 py-2.5" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink-900/5">
                    {filtered.map((t) => (
                      <tr key={t.id} className="transition hover:bg-ink-900/[0.02]">
                        <td className="whitespace-nowrap px-4 py-2.5 text-ink-500">{formatDate(t.date, { day: '2-digit', month: 'short', year: '2-digit' })}</td>
                        <td className="px-3 py-2.5">
                          <p className="font-medium">{t.party}</p>
                          {t.note && <p className="max-w-[240px] truncate text-[11px] text-ink-500">{t.note}</p>}
                        </td>
                        <td className="px-3 py-2.5">
                          <Badge tone={t.type === 'income' ? 'green' : 'amber'}>{t.category}</Badge>
                        </td>
                        <td className="px-3 py-2.5 text-ink-700">{programLabel(t.program)}</td>
                        <td className="px-3 py-2.5 text-ink-500">{t.method}</td>
                        <td className={cn('whitespace-nowrap px-3 py-2.5 text-right font-semibold', t.type === 'income' ? 'text-brand-700' : 'text-red-600')}>
                          {t.type === 'income' ? '+' : '−'}{money(t.amount)}
                        </td>
                        <td className="px-3 py-2.5">
                          <select
                            value={t.status || 'Cleared'}
                            onChange={(e) => onStatusChange({ id: t.id, patch: { status: e.target.value } })}
                            className={cn('rounded-full border-0 px-2.5 py-1 text-xs font-bold',
                              t.status === 'Reconciled' ? 'bg-emerald-50 text-emerald-700'
                                : t.status === 'Pending' ? 'bg-amber-50 text-amber-700'
                                : t.status === 'Rejected' ? 'bg-red-50 text-red-700'
                                : 'bg-ink-900/6 text-ink-700')}
                          >
                            {TXN_STATUS.map((s) => <option key={s}>{s}</option>)}
                          </select>
                        </td>
                        <td className="px-3 py-2.5">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuItem onSelect={() => onEdit(t)}><Pencil className="h-4 w-4" /> Edit</DropdownMenuItem>
                              <DropdownMenuItem onSelect={() => onStatusChange({ id: t.id, patch: { status: 'Reconciled' } })}>
                                <BadgeCheck className="h-4 w-4" /> Mark reconciled
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-red-600 data-[highlighted]:bg-red-50" onSelect={() => onDelete(t)}>
                                <Trash2 className="h-4 w-4" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {filtered.length > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-ink-900/5 px-4 py-3 text-xs text-ink-500">
                <span>{filtered.length} entries · {money(sumBy(filtered.filter((t) => t.type === 'income')))} in · {money(sumBy(filtered.filter((t) => t.type === 'expense')))} out</span>
                <span className="font-semibold text-ink-700">
                  Net {money(sumBy(filtered.filter((t) => t.type === 'income')) - sumBy(filtered.filter((t) => t.type === 'expense')))}
                </span>
              </div>
            )}
          </Card>
        </TabsContent>
  )
}

import { format, parseISO } from 'date-fns'
import { Search, Filter, Plus, Users, MoreHorizontal, Pencil, Trash2, UserPlus, IdCard, UserCheck, UserX, RefreshCw } from 'lucide-react'
import {
  Card, Button, Input, Badge, Avatar, AvatarFallback, SelectField, TabsContent,
  EmptyState, Skeleton, DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, Progress,
} from '../../../components/admin/ui'
import { MEMBER_TYPES, MEMBER_STATUSES, MEMBER_TIERS } from '../../../data/seedData'
import { renewalState, money } from '../../../lib/finance'
import { formatDate, initials, cn } from '../../../lib/utils'

/**
 * Directory tab: filters plus the member table. Owns no data — the parent
 * fetches, filters and mutates; this renders and reports intent.
 */
export default function DirectoryPanel({
  members, filtered, isLoading, totals, hasFilters,
  q, onQuery, typeFilter, onTypeFilter, statusFilter, onStatusFilter,
  tierFilter, onTierFilter, sort, onSort, onResetFilters,
  onEdit, onOpen, onDelete, onSetStatus, onAdd, onRenew,
}) {
  return (
        <TabsContent value="directory">
          <Card>
            {/* filters */}
            <div className="flex flex-wrap items-center gap-2 border-b border-ink-900/5 p-3.5">
              <div className="relative min-w-[200px] flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-500" />
                <Input className="pl-9" value={q} onChange={(e) => onQuery(e.target.value)} placeholder="Search name, email, phone, centre…" />
              </div>
              <div className="w-[150px]">
                <SelectField value={typeFilter} onChange={onTypeFilter} options={[{ value: 'all', label: 'All types' }, ...MEMBER_TYPES]} />
              </div>
              <div className="w-[150px]">
                <SelectField value={statusFilter} onChange={onStatusFilter} options={[{ value: 'all', label: 'All statuses' }, ...MEMBER_STATUSES]} />
              </div>
              <div className="w-[150px]">
                <SelectField value={tierFilter} onChange={onTierFilter} options={[{ value: 'all', label: 'All tiers' }, ...MEMBER_TIERS]} />
              </div>
              <div className="w-[150px]">
                <SelectField value={sort} onChange={onSort} options={[
                  { value: 'name', label: 'Sort: name' }, { value: 'joined', label: 'Sort: newest' },
                  { value: 'renews', label: 'Sort: renewal' }, { value: 'given', label: 'Sort: contributed' },
                ]} />
              </div>
              {hasFilters && (
                <Button variant="ghost" size="sm" onClick={onResetFilters}><Filter className="h-3.5 w-3.5" /> Clear</Button>
              )}
            </div>

            {isLoading ? (
              <div className="space-y-2 p-5">
                {[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
              </div>
            ) : filtered.length === 0 ? (
              <div className="p-5">
                <EmptyState
                  icon={Users}
                  title={members.length ? 'No members match those filters' : 'No members yet'}
                  text={members.length ? 'Try clearing the filters or searching for something else.' : 'Add your first member to start tracking renewals, dues and participation.'}
                  action={<Button onClick={onAdd}><UserPlus className="h-4 w-4" /> Add member</Button>}
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] text-sm">
                  <thead>
                    <tr className="border-b border-ink-900/8 text-left text-[11px] uppercase tracking-wide text-ink-500">
                      <th className="px-4 py-2.5 font-bold">Member</th>
                      <th className="px-3 py-2.5 font-bold">Type / tier</th>
                      <th className="px-3 py-2.5 font-bold">Centre</th>
                      <th className="px-3 py-2.5 font-bold">Joined</th>
                      <th className="px-3 py-2.5 font-bold">Renewal</th>
                      <th className="px-3 py-2.5 text-right font-bold">Contributed</th>
                      <th className="px-3 py-2.5 font-bold">Status</th>
                      <th className="w-10 px-3 py-2.5" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink-900/5">
                    {filtered.map((m) => {
                      const r = renewalState(m)
                      const given = totals.get(m.id)?.given || 0
                      return (
                        <tr key={m.id} className="transition hover:bg-ink-900/[0.02]">
                          <td className="px-4 py-3">
                            <button onClick={() => onOpen(m)} className="flex items-center gap-3 text-left">
                              <Avatar>
                                {m.avatar ? <img src={m.avatar} alt="" className="h-full w-full object-cover" /> : null}
                                <AvatarFallback>{initials(m.name)}</AvatarFallback>
                              </Avatar>
                              <span>
                                <span className="block font-semibold hover:text-brand-700">{m.name}</span>
                                <span className="block text-[11px] text-ink-500">{m.memberNo} · {m.email || m.phone || '—'}</span>
                              </span>
                            </button>
                          </td>
                          <td className="px-3 py-3">
                            <span className="block">{m.type}</span>
                            <span className="text-[11px] text-ink-500">
                              {m.tier}
                              {m.tier === 'Family' && m.household?.length ? ` · ${m.household.length + 1} people` : ''}
                              {m.feeAmount ? ` · ₹${Number(m.feeAmount).toLocaleString('en-IN')}/${m.feeCycle === 'monthly' ? 'mo' : 'yr'}` : ''}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-ink-700">{m.centre || '—'}</td>
                          <td className="px-3 py-3 text-ink-700">{m.joined ? format(parseISO(m.joined), 'dd MMM yy') : '—'}</td>
                          <td className="px-3 py-3">
                            <Badge tone={r.tone}>{r.label}</Badge>
                          </td>
                          <td className="px-3 py-3 text-right font-semibold">
                            {given ? <span className="text-brand-700">{money(given)}</span> : <span className="text-ink-500">—</span>}
                          </td>
                          <td className="px-3 py-3">
                            <select
                              value={m.status}
                              onChange={(e) => onSetStatus(m, e.target.value)}
                              className={cn(
                                'rounded-full border-0 px-2.5 py-1 text-xs font-bold',
                                m.status === 'Active' ? 'bg-emerald-50 text-emerald-700'
                                  : m.status === 'Pending' ? 'bg-amber-50 text-amber-700'
                                  : m.status === 'Suspended' ? 'bg-red-50 text-red-700'
                                  : 'bg-ink-900/6 text-ink-700',
                              )}
                            >
                              {MEMBER_STATUSES.map((s) => <option key={s}>{s}</option>)}
                            </select>
                          </td>
                          <td className="px-3 py-3">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent>
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuItem onSelect={() => onOpen(m)}><IdCard className="h-4 w-4" /> View profile</DropdownMenuItem>
                                <DropdownMenuItem onSelect={() => onEdit(m)}><Pencil className="h-4 w-4" /> Edit</DropdownMenuItem>
                                <DropdownMenuItem onSelect={() => onRenew(m, true)}><RefreshCw className="h-4 w-4" /> Renew + record fee</DropdownMenuItem>
                                <DropdownMenuSeparator />
                                {m.status === 'Active'
                                  ? <DropdownMenuItem onSelect={() => onSetStatus(m, 'Suspended')}><UserX className="h-4 w-4" /> Suspend</DropdownMenuItem>
                                  : <DropdownMenuItem onSelect={() => onSetStatus(m, 'Active')}><UserCheck className="h-4 w-4" /> Activate</DropdownMenuItem>}
                                <DropdownMenuItem className="text-red-600 data-[highlighted]:bg-red-50" onSelect={() => onDelete(m)}>
                                  <Trash2 className="h-4 w-4" /> Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
            {filtered.length > 0 && (
              <div className="flex items-center justify-between border-t border-ink-900/5 px-4 py-3 text-xs text-ink-500">
                <span>Showing {filtered.length} of {members.length} members</span>
                <span>Sorted by {sort}</span>
              </div>
            )}
          </Card>
        </TabsContent>
  )
}

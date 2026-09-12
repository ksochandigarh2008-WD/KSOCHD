import { format, parseISO } from 'date-fns'
import { CalendarClock, Plus, Pencil, Trash2, ArrowDownRight, MoreHorizontal } from 'lucide-react'
import {
  Card, CardHeader, CardTitle, CardBody, Button, Badge, EmptyState, TabsContent,
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator,
} from '../../../components/admin/ui'
import { money, daysUntil } from '../../../lib/finance'

/** Commitments tab: recurring pledges and what is due next. */
export default function PledgesPanel({ pledges, programLabel, onAdd, onEdit, onRecord, onToggle, onDelete }) {
  return (
        <TabsContent value="pledges">
          <Card>
            <CardHeader className="flex flex-wrap items-center justify-between gap-3">
              <CardTitle>Recurring commitments</CardTitle>
              <Button size="sm" onClick={onAdd}><Plus className="h-3.5 w-3.5" /> Add commitment</Button>
            </CardHeader>
            <CardBody>
              {pledges.length === 0 ? (
                <EmptyState icon={CalendarClock} title="No commitments tracked"
                  text="Record pledged monthly or annual giving here so you can forecast income."
                  action={<Button onClick={onAdd}><Plus className="h-4 w-4" /> Add commitment</Button>} />
              ) : (
                <ul className="divide-y divide-ink-900/5">
                  {pledges.map((p) => {
                    const d = daysUntil(p.nextDue)
                    const due = d == null ? null : d < 0 ? { label: `${Math.abs(d)}d overdue`, tone: 'red' }
                      : d <= 14 ? { label: `Due in ${d}d`, tone: 'amber' } : { label: `Due in ${d}d`, tone: 'slate' }
                    return (
                      <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                        <div className="min-w-0">
                          <p className="font-semibold">{p.name}</p>
                          <p className="text-[11px] text-ink-500">
                            {money(p.amount)} · {p.frequency} · {programLabel(p.program)}
                            {p.nextDue && ` · next ${format(parseISO(p.nextDue), 'dd MMM yyyy')}`}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {due && <Badge tone={due.tone}>{due.label}</Badge>}
                          <Badge tone={p.status === 'Active' ? 'green' : 'slate'}>{p.status}</Badge>
                          <Button size="sm" variant="subtle" onClick={() => onRecord(p)}>
                            <ArrowDownRight className="h-3.5 w-3.5" /> Record receipt
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              <DropdownMenuItem onSelect={() => onEdit(p)}><Pencil className="h-4 w-4" /> Edit</DropdownMenuItem>
                              <DropdownMenuItem onSelect={() => onToggle(p)}>
                                {p.status === 'Active' ? 'Pause' : 'Resume'}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-red-600 data-[highlighted]:bg-red-50" onSelect={() => onDelete(p.id)}>
                                <Trash2 className="h-4 w-4" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </CardBody>
          </Card>
        </TabsContent>
  )
}

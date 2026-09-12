import { Target, Trash2 } from 'lucide-react'
import {
  Card, CardHeader, CardTitle, CardBody, Button, Input, Label, SelectField,
  Badge, Progress, EmptyState, Separator, TabsContent,
} from '../../../components/admin/ui'
import { money, compactMoney } from '../../../lib/finance'

/**
 * Budgets tab: plan vs actual for one financial year (1 Apr – 31 Mar), plus the
 * form that sets them. The FY maths lives in lib/finance, not here.
 */
export default function BudgetsPanel({
  budgets, budgetsVsActual, budgetFy, onFy, budgetFys, programs, programLabel,
  budgetDraft, onDraft, onSave, onDeleteBudget,
}) {
  return (
        <TabsContent value="budgets">
          <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
            <Card>
              <CardHeader className="flex flex-wrap items-center justify-between gap-3">
                <CardTitle>Budget vs actual — FY {budgetFy}</CardTitle>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wide text-ink-500">Financial year</span>
                  <select
                    value={budgetFy}
                    onChange={(e) => onFy(e.target.value)}
                    className="rounded-lg border border-ink-900/10 bg-white px-2.5 py-1.5 text-sm font-semibold"
                    aria-label="Budget financial year"
                  >
                    {budgetFys.map((y) => <option key={y} value={y}>FY {y}</option>)}
                  </select>
                </div>
              </CardHeader>
              <CardBody className="space-y-5">
                {budgetsVsActual.length === 0 ? (
                  <EmptyState icon={Target} title="No budgets set" text="Add an annual budget per programme to track spend against plan." />
                ) : (
                  budgetsVsActual.map((b) => (
                    <div key={b.program}>
                      <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2 text-sm">
                        <span className="font-medium">{b.label}</span>
                        <span className="text-ink-500">
                          <span className="font-semibold text-ink-900">{money(b.actual)}</span> of {money(b.budget)}
                          <Badge className="ml-2" tone={b.pct > 100 ? 'red' : b.pct > 80 ? 'amber' : 'green'}>{b.pct}%</Badge>
                        </span>
                      </div>
                      <Progress value={Math.min(100, b.pct)} indicatorClassName={b.pct > 100 ? 'bg-red-500' : b.pct > 80 ? 'bg-amber-500' : 'bg-brand-600'} />
                      <p className="mt-1 text-[11px] text-ink-500">
                        {money(Math.max(0, b.budget - b.actual))} remaining
                        {b.pct > 100 && ` · over by ${money(b.actual - b.budget)}`}
                      </p>
                    </div>
                  ))
                )}
              </CardBody>
            </Card>

            <Card>
              <CardHeader><CardTitle>Set a budget</CardTitle></CardHeader>
              <CardBody className="space-y-3">
                <SelectField label="Programme" value={budgetDraft.program} onChange={(v) => onDraft({ ...budgetDraft, program: v })}
                  options={programs.map((p) => ({ value: p.slug, label: p.title }))} />
                <SelectField
                  label="Financial year" value={budgetDraft.fy}
                  onChange={(v) => onDraft({ ...budgetDraft, fy: v })}
                  options={budgetFys.map((y) => ({ value: y, label: `FY ${y}` }))}
                />
                <div>
                  <Label>Annual budget (₹)</Label>
                  <Input type="number" value={budgetDraft.amount} onChange={(e) => onDraft({ ...budgetDraft, amount: e.target.value })} placeholder="1000000" />
                </div>
                <Button
                  className="w-full"
                  disabled={!budgetDraft.program || !budgetDraft.amount}
                  onClick={onSave}
                >
                  Save budget
                </Button>
                <Separator />
                <div className="space-y-2">
                  {budgets.map((b) => (
                    <div key={b.id} className="flex items-center justify-between gap-2 text-xs">
                      <span className="truncate">{programLabel(b.program)} · FY {b.fy || (b.year ? `${b.year}-${String((Number(b.year) + 1) % 100).padStart(2, '0')}` : '—')}</span>
                      <span className="flex items-center gap-2">
                        <span className="font-semibold">{compactMoney(b.amount)}</span>
                        <button onClick={() => onDeleteBudget(b.id)} className="rounded p-1 text-red-600 hover:bg-red-50"><Trash2 className="h-3.5 w-3.5" /></button>
                      </span>
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>
          </div>
        </TabsContent>
  )
}

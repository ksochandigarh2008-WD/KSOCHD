import {
  ResponsiveContainer, ComposedChart, Area, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RTooltip, Legend, PieChart, Pie, Cell,
} from 'recharts'
import { Card, CardHeader, CardTitle, CardBody, Badge, Progress, TabsContent } from '../../../components/admin/ui'
import { sumBy, money, compactMoney } from '../../../lib/finance'
import { CHART_COLORS } from './constants'

/** Overview tab: the four charts describing the selected period. */
export default function OverviewPanel({ range, series, expenseMix, incomeMix, byProgram }) {
  return (
        <TabsContent value="overview">
          <div className="grid gap-5 lg:grid-cols-2">
            <Card className="lg:col-span-2">
              <CardHeader className="flex items-center justify-between">
                <CardTitle>Income vs expenses</CardTitle>
                <Badge tone="slate">{range.label}</Badge>
              </CardHeader>
              <CardBody className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={series} margin={{ top: 8, right: 12, left: 4, bottom: 0 }}>
                    <defs>
                      <linearGradient id="cumGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6366f1" stopOpacity={0.28} />
                        <stop offset="100%" stopColor="#6366f1" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgb(15 23 42 / 0.07)" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 12 }} stroke="rgb(100 116 139)" />
                    <YAxis tick={{ fontSize: 12 }} stroke="rgb(100 116 139)" tickFormatter={(v) => compactMoney(v)} />
                    <RTooltip formatter={(v) => money(v)} contentStyle={{ borderRadius: 12, border: '1px solid rgb(15 23 42 / 0.08)', fontSize: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" />
                    <Bar dataKey="income" name="Income" fill="#0d9488" radius={[4, 4, 0, 0]} maxBarSize={28} />
                    <Bar dataKey="expense" name="Expenses" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={28} />
                    <Area type="monotone" dataKey="cumulative" name="Cumulative balance" stroke="#6366f1" strokeWidth={2} fill="url(#cumGrad)" />
                  </ComposedChart>
                </ResponsiveContainer>
              </CardBody>
            </Card>

            <Card>
              <CardHeader><CardTitle>Where the money went</CardTitle></CardHeader>
              <CardBody className="h-72">
                {expenseMix.length === 0 ? (
                  <p className="grid h-full place-items-center text-sm text-ink-500">No expenses in this period.</p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={expenseMix} dataKey="value" nameKey="name" innerRadius={54} outerRadius={88} paddingAngle={2}>
                        {expenseMix.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                      </Pie>
                      <RTooltip formatter={(v) => money(v)} contentStyle={{ borderRadius: 12, border: '1px solid rgb(15 23 42 / 0.08)', fontSize: 12 }} />
                      <Legend verticalAlign="bottom" height={44} iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardBody>
            </Card>

            <Card>
              <CardHeader><CardTitle>Funding mix</CardTitle></CardHeader>
              <CardBody>
                {incomeMix.length === 0 ? (
                  <p className="py-8 text-center text-sm text-ink-500">No income in this period.</p>
                ) : (
                  <ul className="space-y-3">
                    {incomeMix.map((c, i) => {
                      const total = sumBy(incomeMix)
                      return (
                        <li key={c.name}>
                          <div className="flex items-center justify-between text-sm">
                            <span className="flex items-center gap-2">
                              <span className="h-2.5 w-2.5 rounded-full" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                              {c.name}
                            </span>
                            <span className="font-semibold">{money(c.value)}</span>
                          </div>
                          <Progress className="mt-1.5 h-1.5" value={(c.value / (total || 1)) * 100}
                            indicatorClassName="bg-brand-600" />
                        </li>
                      )
                    })}
                  </ul>
                )}
              </CardBody>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader><CardTitle>Programme split ({range.label})</CardTitle></CardHeader>
              <CardBody>
                {byProgram.length === 0 ? (
                  <p className="py-8 text-center text-sm text-ink-500">No transactions in this period.</p>
                ) : (
                  <div className="space-y-4">
                    {byProgram.map((p) => {
                      const max = Math.max(...byProgram.map((x) => Math.max(x.income, x.expense)))
                      return (
                        <div key={p.program}>
                          <div className="mb-1.5 flex items-center justify-between text-sm">
                            <span className="font-medium">{p.label}</span>
                            <span className="text-ink-500">
                              <span className="font-semibold text-brand-700">+{compactMoney(p.income)}</span>
                              {' / '}
                              <span className="font-semibold text-red-600">−{compactMoney(p.expense)}</span>
                            </span>
                          </div>
                          <div className="space-y-1">
                            <Progress value={(p.income / (max || 1)) * 100} className="h-1.5" indicatorClassName="bg-brand-600" />
                            <Progress value={(p.expense / (max || 1)) * 100} className="h-1.5" indicatorClassName="bg-amber-500" />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardBody>
            </Card>
          </div>
        </TabsContent>
  )
}

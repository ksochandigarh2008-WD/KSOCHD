import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip as RTooltip, PieChart, Pie, Cell, Legend,
} from 'recharts'
import {
  Card, CardHeader, CardTitle, CardBody, Badge, Avatar, AvatarFallback, Progress, TabsContent, Tooltip,
} from '../../../components/admin/ui'
import { money } from '../../../lib/finance'
import { initials } from '../../../lib/utils'
import { CHART_COLORS } from '../../../lib/palette'

/** Insights tab: growth, type mix and the top contributors. */
export default function InsightsPanel({ members, totals, growth, typeMix }) {
  return (
        <TabsContent value="insights">
          <div className="grid gap-5 lg:grid-cols-2">
            <Card>
              <CardHeader><CardTitle>Membership growth</CardTitle></CardHeader>
              <CardBody className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={growth} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
                    <defs>
                      <linearGradient id="memberGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#0d9488" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="#0d9488" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgb(15 23 42 / 0.07)" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 12 }} stroke="rgb(100 116 139)" />
                    <YAxis tick={{ fontSize: 12 }} stroke="rgb(100 116 139)" allowDecimals={false} />
                    <RTooltip contentStyle={{ borderRadius: 12, border: '1px solid rgb(15 23 42 / 0.08)', fontSize: 12 }} />
                    <Area type="monotone" dataKey="total" name="Total members" stroke="#0d9488" strokeWidth={2} fill="url(#memberGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardBody>
            </Card>

            <Card>
              <CardHeader><CardTitle>Members by type</CardTitle></CardHeader>
              <CardBody className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={typeMix} dataKey="value" nameKey="name" innerRadius={52} outerRadius={84} paddingAngle={2}>
                      {typeMix.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                    </Pie>
                    <RTooltip contentStyle={{ borderRadius: 12, border: '1px solid rgb(15 23 42 / 0.08)', fontSize: 12 }} />
                    <Legend verticalAlign="bottom" height={28} iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              </CardBody>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader><CardTitle>Top contributors</CardTitle></CardHeader>
              <CardBody>
                {members.length === 0 || [...totals.entries()].length === 0 ? (
                  <p className="py-6 text-center text-sm text-ink-500">
                    Link a member on a transaction to see contributions ranked here.
                  </p>
                ) : (
                  <ul className="space-y-3">
                    {[...totals.entries()]
                      .sort((a, b) => b[1].given - a[1].given)
                      .slice(0, 8)
                      .map(([id, row]) => {
                        const m = members.find((x) => x.id === id)
                        const max = Math.max(...[...totals.values()].map((v) => v.given))
                        return (
                          <li key={id} className="flex items-center gap-3">
                            <Avatar className="h-8 w-8"><AvatarFallback className="text-[10px]">{initials(m?.name || '?')}</AvatarFallback></Avatar>
                            <div className="min-w-0 flex-1">
                              <div className="flex justify-between gap-3">
                                <span className="truncate text-sm font-medium">{m?.name || 'Unknown member'}</span>
                                <span className="shrink-0 text-sm font-bold text-brand-700">{money(row.given)}</span>
                              </div>
                              <Progress className="mt-1.5 h-1.5" value={(row.given / (max || 1)) * 100} />
                            </div>
                            <Tooltip content={`${row.count} transactions`}>
                              <Badge tone="slate">{row.count}</Badge>
                            </Tooltip>
                          </li>
                        )
                      })}
                  </ul>
                )}
              </CardBody>
            </Card>
          </div>
        </TabsContent>
  )
}

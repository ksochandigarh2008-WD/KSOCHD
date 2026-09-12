import { Card, Badge, Progress, TabsContent } from '../../../components/admin/ui'
import { MEMBER_TIERS, TIER_FEES } from '../../../data/seedData'
import { money } from '../../../lib/finance'

/** Tiers & fees tab: who is on which tier, what the renewals are worth. */
export default function TiersPanel({ members }) {
  return (
        <TabsContent value="tiers">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {MEMBER_TIERS.map((tier) => {
              const onTier = members.filter((m) => m.tier === tier)
              const count = onTier.length
              const revenue = onTier.reduce((a, m) => a + Number(m.feeAmount || 0), 0)
              const people = onTier.reduce((a, m) => a + 1 + (m.household?.length || 0), 0)
              return (
                <Card key={tier} className="p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-display text-lg font-bold">{tier}</p>
                      <p className="text-sm text-ink-500">{money(TIER_FEES[tier] || 0)} per year</p>
                    </div>
                    <Badge tone="brand">{count}</Badge>
                  </div>
                  <Progress className="mt-4" value={members.length ? (count / members.length) * 100 : 0} />
                  <p className="mt-2 text-xs text-ink-500">
                    {revenue ? `${money(revenue)} expected from renewals` : 'No members on this tier yet'}
                  </p>
                  <p className="text-xs text-ink-500">
                    {people} {people === 1 ? 'person' : 'people'} covered
                    {tier === 'Family' && count ? ' (members + households)' : ''}
                  </p>
                </Card>
              )
            })}
          </div>
        </TabsContent>
  )
}

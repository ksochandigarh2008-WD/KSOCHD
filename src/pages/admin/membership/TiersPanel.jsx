import { useState } from 'react'
import { Plus, Trash2, Pencil, Users } from 'lucide-react'
import { toast } from 'sonner'
import {
  Card, Badge, Progress, TabsContent, Button, Input, Label, SelectField, ConfirmDialog,
} from '../../../components/admin/ui'
import { FEE_CYCLES } from '../../../data/seedData'
import { money } from '../../../lib/finance'
import { membershipOf, tiersInUse, cycleLabel } from '../../../lib/membership'
import { useSite } from '../../../store/useSite'

/**
 * Tiers & fees tab.
 *
 * Read-only summary cards on top (what each tier is worth and how many people
 * it covers), with an editing panel underneath. Tiers used to be constants in
 * seedData.js; they now live in settings, so renaming or repricing one is an
 * admin action rather than a code change.
 *
 * Two guards matter here and both are deliberate:
 *   - a tier that members are sitting on cannot be removed without confirming,
 *     because those records would be left pointing at nothing;
 *   - the last remaining tier cannot be removed at all, because every member
 *     must be on some tier and every dropdown would otherwise be empty.
 */
export default function TiersPanel({ members }) {
  const settings = useSite((s) => s.settings)
  const addTier = useSite((s) => s.addMembershipTier)
  const updateTier = useSite((s) => s.updateMembershipTier)
  const removeTier = useSite((s) => s.removeMembershipTier)

  const tiers = membershipOf(settings).tiers
  const inUse = tiersInUse(members)

  const [draft, setDraft] = useState({ name: '', fee: 0 })
  const [pendingRemoval, setPendingRemoval] = useState(null)

  const onAdd = () => {
    const res = addTier({ name: draft.name, fee: draft.fee })
    if (!res.ok) return toast.error(res.reason)
    toast.success(`Tier “${draft.name.trim()}” added`)
    setDraft({ name: '', fee: 0 })
  }

  const onRemove = (name, force = false) => {
    const res = removeTier(name, { force })
    if (res.ok) {
      toast.success(
        res.inUse
          ? `Tier removed — ${res.inUse} member${res.inUse === 1 ? '' : 's'} left on it`
          : 'Tier removed',
      )
      setPendingRemoval(null)
      return
    }
    if (res.reason === 'in use') return setPendingRemoval({ name, inUse: res.inUse })
    toast.error(res.reason)
  }

  const onRename = (from, name) => {
    if (String(name).trim() === from) return
    const res = updateTier(from, { name })
    if (!res.ok) return toast.error(res.reason)
    if (res.moved) toast.success(`${res.moved} member${res.moved === 1 ? '' : 's'} moved to “${name.trim()}”`)
  }

  return (
    <TabsContent value="tiers">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tiers.map((tier) => {
          const onTier = members.filter((m) => m.tier === tier.name)
          const count = onTier.length
          const revenue = onTier.reduce((a, m) => a + Number(m.feeAmount || 0), 0)
          const people = onTier.reduce((a, m) => a + 1 + (m.household?.length || 0), 0)
          const households = onTier.reduce((a, m) => a + (m.household?.length || 0), 0)
          return (
            <Card key={tier.name} className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-display text-lg font-bold">{tier.name}</p>
                  <p className="text-sm text-ink-500">
                    {money(tier.fee)} {tier.cycle === 'monthly' ? 'per month' : 'per year'}
                  </p>
                </div>
                <Badge tone="brand">{count}</Badge>
              </div>
              <Progress className="mt-4" value={members.length ? (count / members.length) * 100 : 0} />
              <p className="mt-2 text-xs text-ink-500">
                {revenue ? `${money(revenue)} expected from renewals` : 'No members on this tier yet'}
              </p>
              <p className="text-xs text-ink-500">
                {people} {people === 1 ? 'person' : 'people'} covered
                {households ? ' (members + households)' : ''}
              </p>
            </Card>
          )
        })}
      </div>

      <Card className="mt-4">
        <div className="border-b border-ink-900/5 p-5">
          <h3 className="flex items-center gap-2 font-display text-base font-bold">
            <Pencil className="h-4 w-4" /> Edit tiers &amp; fees
          </h3>
          <p className="mt-0.5 text-xs text-ink-500">
            Renaming a tier moves the members on it. A member&rsquo;s own fee is never rewritten by a
            repricing — only the tier default changes.
          </p>
        </div>

        <div className="space-y-3 p-5">
          {tiers.map((tier) => (
            <div key={tier.name} className="flex flex-wrap items-end gap-3 rounded-xl border border-ink-900/10 p-3.5">
              <div className="min-w-[180px] flex-1">
                <Label>Tier name</Label>
                <Input
                  defaultValue={tier.name}
                  onBlur={(e) => onRename(tier.name, e.target.value)}
                  aria-label={`Rename ${tier.name}`}
                />
              </div>
              <div className="w-[130px]">
                <Label>Fee (₹)</Label>
                <Input
                  type="number"
                  value={tier.fee}
                  onChange={(e) => updateTier(tier.name, { fee: Number(e.target.value) })}
                  aria-label={`Fee for ${tier.name}`}
                />
              </div>
              <div className="w-[150px]">
                <SelectField
                  label="Cycle"
                  value={tier.cycle}
                  onChange={(v) => updateTier(tier.name, { cycle: v })}
                  options={[...FEE_CYCLES]}
                />
              </div>
              <div className="flex items-center gap-2 pb-1">
                <Badge tone={inUse.includes(tier.name) ? 'slate' : 'green'}>
                  <Users className="h-3 w-3" />
                  {members.filter((m) => m.tier === tier.name).length}
                </Badge>
                <Button
                  variant="ghost" size="icon"
                  onClick={() => onRemove(tier.name)}
                  disabled={tiers.length <= 1}
                  aria-label={`Remove ${tier.name}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <p className="w-full text-[11px] text-ink-500">{cycleLabel(tier.cycle)}</p>
            </div>
          ))}

          <div className="flex flex-wrap items-end gap-3 border-t border-ink-900/5 pt-4">
            <div className="min-w-[180px] flex-1">
              <Label>New tier</Label>
              <Input
                value={draft.name}
                onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                placeholder="Student"
                aria-label="New tier name"
              />
            </div>
            <div className="w-[130px]">
              <Label>Fee (₹)</Label>
              <Input
                type="number"
                value={draft.fee}
                onChange={(e) => setDraft((d) => ({ ...d, fee: Number(e.target.value) }))}
                aria-label="New tier fee"
              />
            </div>
            <Button variant="outline" onClick={onAdd} disabled={!draft.name.trim()}>
              <Plus className="h-4 w-4" /> Add tier
            </Button>
          </div>
        </div>
      </Card>

      <ConfirmDialog
        open={Boolean(pendingRemoval)}
        onOpenChange={(v) => !v && setPendingRemoval(null)}
        title={`Remove the “${pendingRemoval?.name}” tier?`}
        description={`${pendingRemoval?.inUse} member${pendingRemoval?.inUse === 1 ? '' : 's'} are still on this tier. They keep their records and their fee, but the tier will no longer appear in the dropdowns — move them to another tier afterwards.`}
        confirmLabel="Remove anyway"
        destructive
        onConfirm={() => onRemove(pendingRemoval.name, true)}
      />
    </TabsContent>
  )
}

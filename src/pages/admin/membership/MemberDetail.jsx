import { format, parseISO } from 'date-fns'
import { Mail, Phone, IdCard, CalendarClock, Wallet, Pencil, Users } from 'lucide-react'
import {
  Dialog, DialogContent, DialogFooter, Button, Badge, Avatar, AvatarFallback, Separator, Progress,
} from '../../../components/admin/ui'
import { MEMBER_TIERS, TIER_FEES } from '../../../data/seedData'
import { renewalState, money } from '../../../lib/finance'
import { formatDate, initials } from '../../../lib/utils'

/** Read-only profile for one member, with their contributions and household. */
export default function MemberDetail({ member, open, onOpenChange, contributions, onEdit }) {
  if (!member) return null
  const renewal = renewalState(member)
  const total = contributions.reduce((a, t) => a + Number(t.amount || 0), 0)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={member.name} description={`${member.memberNo} · ${member.type} · ${member.tier}`} style={{ '--dialog-w': '38rem' }}>
        <div className="flex items-center gap-4">
          <Avatar className="h-14 w-14">
            {member.avatar ? <img src={member.avatar} alt="" className="h-full w-full object-cover" /> : null}
            <AvatarFallback className="text-base">{initials(member.name)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <Badge tone={member.status === 'Active' ? 'green' : member.status === 'Pending' ? 'amber' : 'slate'}>{member.status}</Badge>
            <p className="mt-1.5 flex items-center gap-1.5 text-xs text-ink-500"><Mail className="h-3.5 w-3.5" /> {member.email || '—'}</p>
            <p className="flex items-center gap-1.5 text-xs text-ink-500"><Phone className="h-3.5 w-3.5" /> {member.phone || '—'}</p>
          </div>
          <Button size="sm" variant="outline" onClick={onEdit}><Pencil className="h-3.5 w-3.5" /> Edit</Button>
        </div>

        <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
          {[
            ['Centre', member.centre],
            ['Joined', member.joined ? format(parseISO(member.joined), 'dd MMM yyyy') : '—'],
            ['Renews', member.renewsOn ? format(parseISO(member.renewsOn), 'dd MMM yyyy') : '—'],
            ['Fee', member.feeAmount ? `${money(member.feeAmount)} / ${member.feeCycle}` : '—'],
            ['Events attended', member.eventsAttended ?? 0],
            ['City', member.city || '—'],
          ].map(([k, v]) => (
            <div key={k}>
              <dt className="text-[11px] font-bold uppercase tracking-wide text-ink-500">{k}</dt>
              <dd className="mt-0.5">{v}</dd>
            </div>
          ))}
        </dl>

        {member.tier === 'Family' && (
          <div className="mt-4">
            <p className="text-[11px] font-bold uppercase tracking-wide text-ink-500">
              Household{member.household?.length ? ` · ${member.household.length + 1} people` : ''}
            </p>
            {member.household?.length ? (
              <ul className="mt-1.5 space-y-1.5">
                {member.household.map((h, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm">
                    <Users className="h-3.5 w-3.5 text-ink-400" />
                    <span className="font-medium">{h.name}</span>
                    <Badge tone="slate">{h.relation}</Badge>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-1 text-sm text-ink-500">No household members recorded yet.</p>
            )}
          </div>
        )}

        {member.skills && (
          <div className="mt-4">
            <p className="text-[11px] font-bold uppercase tracking-wide text-ink-500">Skills</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {String(member.skills).split(',').map((s) => s.trim()).filter(Boolean).map((s) => (
                <Badge key={s} tone="slate">{s}</Badge>
              ))}
            </div>
          </div>
        )}

        {renewal.days != null && (
          <div className="mt-4 rounded-xl bg-ink-900/[0.03] p-3.5">
            <p className="text-xs font-semibold">Renewal</p>
            <p className="mt-1 text-sm text-ink-700">{renewal.label}</p>
            <Progress
              className="mt-2"
              value={Math.max(0, Math.min(100, 100 - (renewal.days / 365) * 100))}
              indicatorClassName={renewal.tone === 'red' ? 'bg-red-500' : renewal.tone === 'amber' ? 'bg-amber-500' : 'bg-brand-600'}
            />
          </div>
        )}

        <div className="mt-5">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-wide text-ink-500">Contributions</p>
            <span className="text-sm font-bold text-brand-700">{money(total)}</span>
          </div>
          {contributions.length === 0 ? (
            <p className="rounded-xl border border-dashed border-ink-900/12 p-4 text-center text-xs text-ink-500">
              No transactions linked to this member yet.
            </p>
          ) : (
            <ul className="divide-y divide-ink-900/5 overflow-hidden rounded-xl border border-ink-900/8">
              {contributions.slice(0, 8).map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-3 px-3.5 py-2.5 text-sm">
                  <div className="min-w-0">
                    <p className="truncate">{t.note || t.category}</p>
                    <p className="text-[11px] text-ink-500">{formatDate(t.date)} · {t.method}</p>
                  </div>
                  <span className="shrink-0 font-semibold text-brand-700">{money(t.amount)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

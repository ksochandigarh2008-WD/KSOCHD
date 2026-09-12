import { useState } from 'react'
import { Inbox, Mail, UserPlus, CalendarDays, Heart, Search, Trash2, CheckCheck } from 'lucide-react'
import { useSite } from '../../store/useSite'
import { Panel } from './components'
import { useToast } from '../../components/ui'
import { ConfirmDialog } from '../../components/admin/ui'
import { formatDate, cn } from '../../lib/utils'

const kindMeta = {
  contact: { label: 'Enquiry', icon: Mail, tone: 'bg-brand-50 text-brand-700' },
  volunteer: { label: 'Volunteer', icon: UserPlus, tone: 'bg-accent-500/15 text-accent-600' },
  event: { label: 'Event', icon: CalendarDays, tone: 'bg-blue-50 text-blue-700' },
  donation: { label: 'Donation', icon: Heart, tone: 'bg-emerald-50 text-emerald-700' },
}

export default function InboxTab() {
  const submissions = useSite((s) => s.submissions)
  const updateSubmission = useSite((s) => s.updateSubmission)
  const removeSubmission = useSite((s) => s.removeSubmission)
  const clearSubmissions = useSite((s) => s.clearSubmissions)
  const toast = useToast()
  const [filter, setFilter] = useState('all')
  const [open, setOpen] = useState(null)
  const [confirmClear, setConfirmClear] = useState(false)

  const list = submissions.filter((s) => (filter === 'all' ? true : filter === 'new' ? s.status === 'new' : s.kind === filter))
  const newCount = submissions.filter((s) => s.status === 'new').length

  return (
    <div className="space-y-5">
      <ConfirmDialog
        open={confirmClear}
        onOpenChange={setConfirmClear}
        title="Clear the whole inbox?"
        description={`${submissions.length} message${submissions.length === 1 ? '' : 's'} will be deleted. Export anything you need first — this cannot be undone.`}
        confirmLabel="Delete all messages"
        destructive
        onConfirm={() => { clearSubmissions(); setConfirmClear(false); toast('Inbox cleared') }}
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Inbox</h1>
          <p className="text-sm text-ink-500">
            {submissions.length} message{submissions.length === 1 ? '' : 's'} · {newCount} unread
          </p>
        </div>
        {submissions.length > 0 && (
          <button onClick={() => setConfirmClear(true)} className="btn-ghost px-3.5 py-2 text-xs">
            <Trash2 className="h-3.5 w-3.5" /> Clear inbox
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {[['all', 'All'], ['new', `Unread (${newCount})`], ['contact', 'Enquiries'], ['volunteer', 'Volunteer'], ['event', 'Events'], ['donation', 'Donations']].map(([k, label]) => (
          <button
            key={k}
            onClick={() => setFilter(k)}
            className={cn('rounded-xl px-4 py-2 text-sm font-semibold transition',
              filter === k ? 'bg-brand-700 text-white' : 'border border-ink-900/10 bg-white text-ink-700 hover:bg-ink-900/5')}
          >
            {label}
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <Panel>
          <div className="py-12 text-center">
            <Inbox className="mx-auto mb-3 h-8 w-8 text-ink-500/50" />
            <p className="font-display text-lg font-semibold">Nothing here</p>
            <p className="mt-1 text-sm text-ink-500">Messages from the contact, volunteer, event and donation forms land here.</p>
          </div>
        </Panel>
      ) : (
        <div className="space-y-3">
          {list.map((s) => {
            const meta = kindMeta[s.kind] || kindMeta.contact
            const isOpen = open === s.id
            return (
              <div key={s.id} className={cn('rounded-2xl border bg-white shadow-soft transition', s.status === 'new' ? 'border-brand-300' : 'border-ink-900/5')}>
                <button
                  onClick={() => {
                    setOpen(isOpen ? null : s.id)
                    if (s.status === 'new') updateSubmission(s.id, { status: 'read' })
                  }}
                  className="flex w-full items-start gap-3 p-4 text-left"
                >
                  <span className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-xl', meta.tone)}>
                    <meta.icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold">{s.name || 'Anonymous'}</span>
                      <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-bold uppercase', meta.tone)}>{meta.label}</span>
                      {s.status === 'new' && <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold uppercase text-red-700">New</span>}
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-ink-500">{s.email || s.phone || '—'} · {formatDate(s.date, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}</span>
                    <span className="mt-1 block truncate text-sm text-ink-700">{s.message}</span>
                  </span>
                </button>

                {isOpen && (
                  <div className="border-t border-ink-900/5 p-4">
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink-700">{s.message}</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {s.email && (
                        <a href={`mailto:${s.email}?subject=Re: your message to KSO`} className="btn-primary px-3.5 py-2 text-xs">Reply by email</a>
                      )}
                      {s.phone && (
                        <a href={`tel:${s.phone}`} className="btn-ghost px-3.5 py-2 text-xs">Call {s.phone}</a>
                      )}
                      <button onClick={() => updateSubmission(s.id, { status: s.status === 'done' ? 'read' : 'done' })} className="btn-ghost px-3.5 py-2 text-xs">
                        <CheckCheck className="h-3.5 w-3.5" /> {s.status === 'done' ? 'Reopen' : 'Mark handled'}
                      </button>
                      <button onClick={() => removeSubmission(s.id)} className="btn-ghost px-3.5 py-2 text-xs text-red-600">
                        <Trash2 className="h-3.5 w-3.5" /> Delete
                      </button>
                    </div>
                    <p className="mt-3 text-[11px] text-ink-500">
                      Demo note: submissions are stored in this browser only. Connect a backend with VITE_API_BASE_URL
                      (see DEPLOY.md) to save them to a real database and email them to your team.
                    </p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

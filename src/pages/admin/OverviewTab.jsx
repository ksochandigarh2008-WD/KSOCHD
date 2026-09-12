import { Link } from 'react-router-dom'
import { Wallet, Users, Inbox, TrendingUp, Sparkles, ArrowUpRight, CalendarDays, AlertTriangle } from 'lucide-react'
import { useSite } from '../../store/useSite'
import { Panel } from './components'
import { useTransactions } from './hooks'
import { formatCurrency, formatDate, formatNumber } from '../../lib/utils'
import { parseISO, startOfToday } from 'date-fns'

export default function OverviewTab({ goTo }) {
  // Selectors, not the whole store: this tab re-renders on every keystroke
  // made anywhere in the admin if it subscribes to everything.
  const memberships = useSite((s) => s.memberships)
  const submissions = useSite((s) => s.submissions)
  const org = useSite((s) => s.content.org)
  const ai = useSite((s) => s.ai)
  const events = useSite((s) => s.content.events)
  const settings = useSite((s) => s.settings)
  // Money lives in the finance system, not the quick-ledger scratchpad.
  const { data: transactions = [] } = useTransactions()

  const income = transactions.filter((r) => r.type === 'income').reduce((a, r) => a + Number(r.amount || 0), 0)
  const expense = transactions.filter((r) => r.type === 'expense').reduce((a, r) => a + Number(r.amount || 0), 0)
  const donors = new Set(transactions.filter((r) => r.type === 'income' && r.party).map((r) => r.party)).size
  const newMsgs = submissions.filter((s) => s.status === 'new').length
  const recent = [...transactions].sort((a, b) => String(b.date).localeCompare(String(a.date))).slice(0, 6)
  const aiOn = settings.aiWidgetEnabled && ai.provider !== 'offline' && Boolean(ai.apiKey)

  const kpis = [
    { label: 'Total received', value: formatCurrency(income), icon: TrendingUp, tone: 'text-brand-700 bg-brand-50', to: 'finance' },
    { label: 'Total spent', value: formatCurrency(expense), icon: Wallet, tone: 'text-accent-600 bg-accent-500/10', to: 'finance' },
    { label: 'Balance', value: formatCurrency(income - expense), icon: Wallet, tone: 'text-ink-900 bg-ink-900/5', to: 'reports' },
    { label: 'Unique donors', value: formatNumber(donors), icon: Users, tone: 'text-brand-700 bg-brand-50', to: 'finance' },
    { label: 'Members', value: formatNumber(memberships.length), icon: Users, tone: 'text-ink-900 bg-ink-900/5', to: 'members' },
    { label: 'Unread messages', value: formatNumber(newMsgs), icon: Inbox, tone: 'text-red-600 bg-red-50', to: 'inbox' },
  ]

  return (
    <div className="space-y-5">
      {/* greeting */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Overview</h1>
          <p className="text-sm text-ink-500">Everything happening across {org.shortName}, at a glance.</p>
        </div>
        <Link to="/" target="_blank" className="btn-primary px-4 py-2 text-xs">
          Open public site <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {settings.showDemoBadge && !settings.productionMode && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <div className="text-sm text-amber-900">
            <p className="font-semibold">This build ships with demo data and placeholder text.</p>
            <p className="mt-0.5">
              Replace the sample organisation details in <strong>Site content → Organisation</strong>, then clear the
              sample ledger rows and inbox items (buttons on their pages) before you go live.
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {kpis.map((k) => (
          <button key={k.label} onClick={() => goTo(k.to)} className="rounded-2xl border border-ink-900/5 bg-white p-5 text-left shadow-soft transition hover:-translate-y-0.5 hover:shadow-lift">
            <div className="flex items-start justify-between">
              <span className={`grid h-10 w-10 place-items-center rounded-xl ${k.tone}`}>
                <k.icon className="h-5 w-5" />
              </span>
              <ArrowUpRight className="h-4 w-4 text-ink-500/50" />
            </div>
            <p className="mt-3 font-display text-2xl font-bold">{k.value}</p>
            <p className="text-xs text-ink-500">{k.label}</p>
          </button>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel
          title="Recent transactions"
          desc="Latest money in and out, from the finance system"
          actions={<button onClick={() => goTo('finance')} className="btn-ghost px-3 py-1.5 text-xs">Open finance</button>}
        >
          {recent.length === 0 ? (
            <p className="py-6 text-center text-sm text-ink-500">No entries yet.</p>
          ) : (
            <ul className="divide-y divide-ink-900/5">
              {recent.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{r.party || r.note || '—'}</p>
                    <p className="text-[11px] text-ink-500">{formatDate(r.date)} · {r.method || '—'} · {r.category || 'general'}</p>
                  </div>
                  <span className={`shrink-0 font-semibold ${r.type === 'income' ? 'text-brand-700' : 'text-red-600'}`}>
                    {r.type === 'income' ? '+' : '−'}{formatCurrency(r.amount)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel
          title="Latest inbox"
          desc="Contact, volunteer, event and donation messages"
          actions={<button onClick={() => goTo('inbox')} className="btn-ghost px-3 py-1.5 text-xs">Open inbox</button>}
        >
          {submissions.length === 0 ? (
            <p className="py-6 text-center text-sm text-ink-500">No messages yet.</p>
          ) : (
            <ul className="divide-y divide-ink-900/5">
              {submissions.slice(0, 6).map((s) => (
                <li key={s.id} className="flex items-start justify-between gap-3 py-2.5 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{s.name || 'Anonymous'}</p>
                    <p className="truncate text-[11px] text-ink-500">{s.kind} · {s.email || s.phone || '—'}</p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${s.status === 'new' ? 'bg-red-50 text-red-700' : 'bg-brand-50 text-brand-700'}`}>
                    {s.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="AI assistant status" desc="What visitors get when they open the chat widget">
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between rounded-xl bg-ink-900/[0.03] px-4 py-3">
              <span className="font-medium">Widget on public site</span>
              <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${settings.aiWidgetEnabled ? 'bg-brand-50 text-brand-700' : 'bg-ink-900/10 text-ink-500'}`}>
                {settings.aiWidgetEnabled ? 'Visible' : 'Hidden'}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-ink-900/[0.03] px-4 py-3">
              <span className="font-medium">Mode</span>
              <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${aiOn ? 'bg-brand-50 text-brand-700' : 'bg-accent-500/15 text-accent-600'}`}>
                {aiOn ? `LLM · ${ai.provider}` : 'Offline retrieval'}
              </span>
            </div>
            <p className="text-xs leading-relaxed text-ink-500">
              Offline mode answers from your own published content with no API key and no cost. Add a key in
              AI assistant to unlock natural language answers.
            </p>
            <button onClick={() => goTo('ai')} className="btn-primary w-full px-4 py-2 text-xs">
              <Sparkles className="h-3.5 w-3.5" /> Configure AI
            </button>
          </div>
        </Panel>

        <Panel title="Upcoming events" desc="From your events list">
          {(events || []).filter((e) => e.date && !Number.isNaN(parseISO(e.date).getTime()) && parseISO(e.date) >= startOfToday()).length === 0 ? (
            <p className="py-6 text-center text-sm text-ink-500">No upcoming events scheduled.</p>
          ) : (
            <ul className="divide-y divide-ink-900/5">
              {(events || [])
                .filter((e) => e.date && !Number.isNaN(parseISO(e.date).getTime()) && parseISO(e.date) >= startOfToday())
                .sort((a, b) => parseISO(a.date) - parseISO(b.date))
                .slice(0, 5)
                .map((e) => (
                  <li key={e.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{e.title}</p>
                      <p className="text-[11px] text-ink-500">{e.location}</p>
                    </div>
                    <span className="flex shrink-0 items-center gap-1 text-xs font-semibold text-brand-700">
                      <CalendarDays className="h-3.5 w-3.5" /> {formatDate(e.date, { day: 'numeric', month: 'short' })}
                    </span>
                  </li>
                ))}
            </ul>
          )}
          <button onClick={() => goTo('collections')} className="btn-ghost mt-3 w-full px-4 py-2 text-xs">Manage events</button>
        </Panel>
      </div>
    </div>
  )
}

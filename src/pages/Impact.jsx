import { Link } from 'react-router-dom'
import { FileText, Download, TrendingUp } from 'lucide-react'
import { useContent, useSite } from '../store/useSite'
import { Reveal, SectionHeading, Counter } from '../components/ui'
import { formatCurrency, formatCompact, formatNumber } from '../lib/utils'
import PageHero from '../components/PageHero'

export default function Impact() {
  const c = useContent()
  const transactions = useSite((s) => s.transactions)
  const impact = c.impact || {}
  const income = transactions.filter((r) => r.type === 'income').reduce((a, r) => a + Number(r.amount || 0), 0)
  const expense = transactions.filter((r) => r.type === 'expense').reduce((a, r) => a + Number(r.amount || 0), 0)
  const yearly = impact.yearly || []
  const maxRaised = Math.max(1, ...yearly.map((y) => y.raised || 0))

  return (
    <>
      <PageHero
        eyebrow="Impact & accountability"
        title={impact.heading || 'Where the money actually goes'}
        text={impact.note}
        crumb="Impact"
      />

      {/* stats */}
      <section className="border-b border-ink-900/5 bg-white">
        <div className="container-page grid grid-cols-2 gap-6 py-10 lg:grid-cols-4">
          {(c.stats || []).map((s) => (
            <div key={s.id} className="text-center">
              <p className="font-display text-3xl font-bold text-brand-700 sm:text-4xl">
                <Counter to={s.value} suffix={s.suffix} />
              </p>
              <p className="mt-1 text-sm text-ink-500">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* allocation */}
      <section className="container-page py-16">
        <div className="grid gap-10 lg:grid-cols-2">
          <Reveal>
            <SectionHeading eyebrow="Allocation" title="Every ₹100 we receive" center={false} />
            <div className="mt-6 overflow-hidden rounded-2xl border border-ink-900/5 bg-white p-6 shadow-soft">
              {/* stacked bar */}
              <div className="flex h-4 w-full overflow-hidden rounded-full bg-ink-900/5">
                {(impact.allocation || []).map((a) => (
                  <div key={a.id} style={{ width: `${a.value}%`, background: a.color }} title={`${a.label}: ${a.value}%`} />
                ))}
              </div>
              <ul className="mt-6 space-y-3">
                {(impact.allocation || []).map((a) => (
                  <li key={a.id} className="flex items-center justify-between gap-4 text-sm">
                    <span className="flex items-center gap-2.5">
                      <span className="h-3 w-3 rounded-sm" style={{ background: a.color }} />
                      {a.label}
                    </span>
                    <span className="font-semibold">{a.value}%</span>
                  </li>
                ))}
              </ul>
              <p className="mt-5 rounded-xl bg-brand-50/70 p-3.5 text-xs leading-relaxed text-ink-700">
                We hold overheads under 12% and publish our audited financials every year. If a donor asks, we can
                trace any rupee to the programme it funded.
              </p>
            </div>
          </Reveal>

          <Reveal delay={80}>
            <SectionHeading eyebrow="Year on year" title="Funds raised and people reached" center={false} />
            <div className="mt-6 rounded-2xl border border-ink-900/5 bg-white p-6 shadow-soft">
              <div className="flex h-52 items-end justify-between gap-4">
                {yearly.map((y) => (
                  <div key={y.id} className="group flex flex-1 flex-col items-center gap-2">
                    <span className="text-[11px] font-semibold text-ink-500 opacity-0 transition group-hover:opacity-100">
                      {formatCompact(y.raised)}
                    </span>
                    <div
                      className="w-full rounded-t-lg bg-gradient-to-t from-brand-700 to-brand-400 transition-all duration-700"
                      style={{ height: `${Math.max(8, (y.raised / maxRaised) * 100)}%` }}
                      title={`${y.year}: ${formatCurrency(y.raised)}`}
                    />
                    <span className="text-xs font-semibold">{y.year}</span>
                  </div>
                ))}
              </div>
              <div className="mt-6 grid grid-cols-2 gap-4 border-t border-ink-900/5 pt-5 sm:grid-cols-4">
                {yearly.map((y) => (
                  <div key={y.id}>
                    <p className="text-[11px] uppercase tracking-wide text-ink-500">{y.year}</p>
                    <p className="font-display text-base font-bold text-brand-700">{formatCompact(y.raised)}</p>
                    <p className="text-[11px] text-ink-500">{formatNumber(y.people)} people</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-5 flex items-start gap-3 rounded-2xl border border-ink-900/5 bg-white p-5 shadow-soft">
              <TrendingUp className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" />
              <p className="text-sm leading-relaxed text-ink-700">
                <span className="font-semibold">Live from the finance ledger: </span>
                {formatCurrency(income)} recorded as received and {formatCurrency(expense)} as spent. These figures
                update as your team records entries in Admin → Finance.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* reports */}
      <section className="bg-ink-900/[0.02] py-16">
        <div className="container-page">
          <Reveal>
            <SectionHeading eyebrow="Downloads" title="Annual reports and audited financials" />
          </Reveal>
          <div className="mx-auto mt-8 max-w-3xl space-y-3">
            {(impact.reports || []).map((r, i) => (
              <Reveal key={r.id} delay={i * 70}>
                <a
                  href={r.href}
                  className="flex items-center gap-4 rounded-2xl border border-ink-900/5 bg-white p-4 shadow-soft transition hover:-translate-y-0.5 hover:shadow-lift"
                >
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700">
                    <FileText className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{r.title}</span>
                    <span className="text-xs text-ink-500">{r.type} · {r.size}</span>
                  </span>
                  <Download className="h-4 w-4 shrink-0 text-ink-500" />
                </a>
              </Reveal>
            ))}
            <p className="mt-4 text-center text-xs text-ink-500">
              Upload your real PDFs to hosting and paste the links in Admin → Content → Impact.
            </p>
          </div>
        </div>
      </section>

      <section className="container-page pb-16">
        <div className="flex flex-wrap items-center justify-between gap-6 rounded-3xl bg-gradient-to-r from-brand-800 to-brand-700 p-8 text-white sm:p-10">
          <div>
            <h2 className="font-display text-2xl font-bold sm:text-3xl">Fund the next number on that chart.</h2>
            <p className="mt-2 text-sm text-white/80">One-time or monthly — both are receipted and traceable.</p>
          </div>
          <Link to="/donate" className="btn-accent">Donate now</Link>
        </div>
      </section>
    </>
  )
}

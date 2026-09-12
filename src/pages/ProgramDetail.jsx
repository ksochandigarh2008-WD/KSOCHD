import { Link, useParams, Navigate } from 'react-router-dom'
import { ArrowRight, ArrowLeft, CheckCircle2 } from 'lucide-react'
import { useContent } from '../store/useSite'
import { Reveal } from '../components/ui'
import { getIcon } from '../lib/iconMap'
import { formatNumber } from '../lib/utils'
import PageHero from '../components/PageHero'

export default function ProgramDetail() {
  const { slug } = useParams()
  const c = useContent()
  const program = (c.programs || []).find((p) => p.slug === slug)
  if (!program) return <Navigate to="/programs" replace />
  const Icon = getIcon(program.icon)
  const others = (c.programs || []).filter((p) => p.slug !== slug).slice(0, 3)

  return (
    <>
      <PageHero eyebrow={program.title} title={program.summary} crumb="Programmes" image={program.image} />

      <section className="container-page py-14">
        <div className="grid gap-12 lg:grid-cols-[1.3fr_0.7fr]">
          <Reveal>
            <div className="prose-kso max-w-none">
              {String(program.body).split('\n\n').map((para, i) => (
                <p key={i}>{para}</p>
              ))}
            </div>

            <h3 className="mt-10 font-display text-xl font-bold">What this looks like in practice</h3>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {[
                'Named programme lead accountable for outcomes',
                'Monthly field report shared with donors',
                'Community advisory group from the neighbourhood',
                'Annual third-party audit of programme spend',
              ].map((item) => (
                <li key={item} className="flex gap-2.5 rounded-xl border border-ink-900/5 bg-white p-3.5 text-sm text-ink-700 shadow-soft">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
                  {item}
                </li>
              ))}
            </ul>
          </Reveal>

          <Reveal delay={80}>
            <aside className="space-y-5 lg:sticky lg:top-24">
              <div className="rounded-2xl border border-ink-900/5 bg-white p-6 shadow-soft">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-50 text-brand-700">
                  <Icon className="h-5 w-5" />
                </span>
                <h3 className="mt-4 font-display text-lg font-bold">Cost to impact</h3>
                <p className="mt-1 text-sm text-ink-700">
                  <span className="font-display text-2xl font-bold text-brand-700">₹{formatNumber(program.costPerUnit)}</span>{' '}
                  {program.unitLabel}.
                </p>
                <Link to="/donate" className="btn-primary mt-4 w-full">
                  Donate to this programme <ArrowRight className="h-4 w-4" />
                </Link>
                <p className="mt-3 text-center text-[11px] text-ink-500">80G receipt issued within 48 hours</p>
              </div>

              <div className="rounded-2xl border border-ink-900/5 bg-white p-6 shadow-soft">
                <h3 className="font-display text-base font-bold">By the numbers</h3>
                <dl className="mt-3 space-y-3">
                  {(program.metrics || []).map((m) => (
                    <div key={m.label} className="flex items-baseline justify-between gap-4">
                      <dt className="text-sm text-ink-500">{m.label}</dt>
                      <dd className="font-display text-lg font-bold text-brand-700">{m.value}</dd>
                    </div>
                  ))}
                </dl>
              </div>

              <div className="rounded-2xl bg-brand-900 p-6 text-white">
                <h3 className="font-display text-base font-bold">Want to work here?</h3>
                <p className="mt-2 text-sm text-white/75">
                  This programme runs on volunteers. Two hours a fortnight is enough to start.
                </p>
                <Link to="/volunteer" className="btn-accent mt-4 w-full">
                  Apply as a volunteer
                </Link>
              </div>
            </aside>
          </Reveal>
        </div>
      </section>

      <section className="bg-ink-900/[0.02] py-14">
        <div className="container-page">
          <h2 className="font-display text-2xl font-bold">Other programmes</h2>
          <div className="mt-6 grid gap-5 sm:grid-cols-3">
            {others.map((p) => (
              <Link key={p.id} to={`/programs/${p.slug}`} className="group overflow-hidden rounded-2xl border border-ink-900/5 bg-white shadow-soft transition hover:-translate-y-1 hover:shadow-lift">
                <img src={p.image} alt={p.title} className="h-36 w-full object-cover" loading="lazy" />
                <div className="p-5">
                  <h3 className="font-display text-base font-bold">{p.title}</h3>
                  <p className="mt-1.5 text-sm text-ink-700">{p.summary}</p>
                  <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-brand-700">
                    View <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-1" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
          <Link to="/programs" className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:gap-2.5">
            <ArrowLeft className="h-4 w-4" /> All programmes
          </Link>
        </div>
      </section>
    </>
  )
}

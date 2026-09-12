import { Link } from 'react-router-dom'
import { ArrowRight, Target, Eye } from 'lucide-react'
import { useContent } from '../store/useSite'
import { Reveal, SectionHeading } from '../components/ui'
import { getIcon } from '../lib/iconMap'
import PageHero from '../components/PageHero'

export default function About() {
  const c = useContent()
  return (
    <>
      <PageHero eyebrow="About KSO" title={c.about.heading} text={`${c.org.fullName} · ${c.org.area}`} crumb="About" />

      <section className="container-page py-16">
        <div className="grid gap-12 lg:grid-cols-[1.15fr_0.85fr]">
          <Reveal>
            <div className="prose-kso max-w-none">
              {c.about.body.map((p, i) => <p key={i}>{p}</p>)}
            </div>

            <div className="mt-10 grid gap-5 sm:grid-cols-2">
              <div className="rounded-2xl border border-ink-900/5 bg-brand-50/60 p-6">
                <Target className="mb-3 h-6 w-6 text-brand-700" />
                <h3 className="font-display text-lg font-bold">Our mission</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-700">
                  To make opportunity in the Tricity a matter of geography no one is punished by — by building
                  education, health and livelihood capacity inside the neighbourhoods that need it most.
                </p>
              </div>
              <div className="rounded-2xl border border-ink-900/5 bg-accent-500/10 p-6">
                <Eye className="mb-3 h-6 w-6 text-accent-600" />
                <h3 className="font-display text-lg font-bold">Our vision</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-700">
                  A Chandigarh Tricity where a child’s outcomes are decided by their effort, not their pin code —
                  and where giving back is ordinary, local and accountable.
                </p>
              </div>
            </div>
          </Reveal>

          <Reveal delay={100}>
            <img src={c.about.image} alt="KSO volunteers" className="h-[360px] w-full rounded-3xl object-cover shadow-lift" loading="lazy" />
            <dl className="mt-6 space-y-3 rounded-2xl border border-ink-900/5 bg-white p-5 shadow-soft text-sm">
              {[
                ['Founded', c.org.foundedYear],
                ['Registered', c.org.registration],
                ['Tax exemption', c.org.taxExemption],
                ['FCRA', c.org.fcra],
                ['Areas', c.org.area],
                ['Office hours', c.org.hours],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 border-b border-ink-900/5 pb-2.5 last:border-0 last:pb-0">
                  <dt className="font-semibold text-ink-500">{k}</dt>
                  <dd className="text-right">{v}</dd>
                </div>
              ))}
            </dl>
          </Reveal>
        </div>
      </section>

      {/* values */}
      <section className="bg-ink-900/[0.02] py-16">
        <div className="container-page">
          <Reveal>
            <SectionHeading eyebrow="How we work" title="Four rules we do not break" />
          </Reveal>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {(c.about.values || []).map((v, i) => {
              const Icon = getIcon(v.icon)
              return (
                <Reveal key={v.id} delay={i * 80}>
                  <div className="h-full rounded-2xl border border-ink-900/5 bg-white p-6 shadow-soft">
                    <span className="mb-4 grid h-11 w-11 place-items-center rounded-xl bg-brand-50 text-brand-700">
                      <Icon className="h-5 w-5" />
                    </span>
                    <h3 className="font-display text-lg font-bold">{v.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-ink-700">{v.text}</p>
                  </div>
                </Reveal>
              )
            })}
          </div>
        </div>
      </section>

      {/* timeline */}
      <section className="container-page py-16">
        <Reveal>
          <SectionHeading eyebrow="Our journey" title={`Since ${c.org.foundedYear}`} />
        </Reveal>
        <div className="mx-auto mt-12 max-w-3xl">
          <ol className="relative border-l border-dashed border-brand-300 pl-8">
            {(c.about.milestones || []).map((m, i) => (
              <Reveal key={m.id} delay={i * 70}>
                <li className="mb-8 last:mb-0">
                  <span className="absolute -left-[13px] grid h-6 w-6 place-items-center rounded-full border-2 border-white bg-brand-600 text-white shadow">
                    <span className="h-1.5 w-1.5 rounded-full bg-white" />
                  </span>
                  <p className="font-display text-lg font-bold text-brand-700">{m.year}</p>
                  <p className="mt-1 text-sm leading-relaxed text-ink-700">{m.text}</p>
                </li>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      {/* team */}
      <section className="bg-ink-900/[0.02] py-16">
        <div className="container-page">
          <Reveal>
            <SectionHeading eyebrow="The team" title="People who run the place" sub="Office bearers and programme leads. Add real names and photos in the admin panel." />
          </Reveal>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {(c.team || []).map((m, i) => (
              <Reveal key={m.id} delay={i * 70}>
                <div className="rounded-2xl border border-ink-900/5 bg-white p-5 text-center shadow-soft">
                  {m.image ? (
                    <img src={m.image} alt={m.name} className="mx-auto h-24 w-24 rounded-full object-cover" />
                  ) : (
                    <span className="mx-auto grid h-24 w-24 place-items-center rounded-full bg-gradient-to-br from-brand-100 to-brand-200 font-display text-2xl font-bold text-brand-800">
                      {String(m.name).replace(/[^A-Za-z ]/g, '').split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('') || '—'}
                    </span>
                  )}
                  <p className="mt-4 font-display text-base font-bold">{m.name}</p>
                  <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">{m.role}</p>
                  <p className="mt-2 text-sm text-ink-600">{m.bio}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* cta */}
      <section className="container-page py-16">
        <Reveal>
          <div className="flex flex-wrap items-center justify-between gap-6 rounded-3xl bg-brand-900 p-8 text-white sm:p-10">
            <div>
              <h2 className="font-display text-2xl font-bold sm:text-3xl">Come and see the work before you commit.</h2>
              <p className="mt-2 text-sm text-white/75">Visit any learning centre on a weekday evening. No appointment needed.</p>
            </div>
            <Link to="/contact" className="btn-accent">
              Plan a visit <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </Reveal>
      </section>
    </>
  )
}

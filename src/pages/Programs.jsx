import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { useContent } from '../store/useSite'
import { Reveal } from '../components/ui'
import { getIcon } from '../lib/iconMap'
import { formatNumber } from '../lib/utils'
import PageHero from '../components/PageHero'

export default function Programs() {
  const c = useContent()
  const programs = c.programs || []

  return (
    <>
      <PageHero
        eyebrow="Programmes"
        title="Four ways we show up, every single week"
        text="Each programme has a named lead, a published budget and a measurable outcome. Click any one to see what it costs and what it delivers."
        crumb="Programmes"
      />

      <section className="container-page py-16">
        <div className="space-y-8">
          {programs.map((p, i) => {
            const Icon = getIcon(p.icon)
            const flip = i % 2 === 1
            return (
              <Reveal key={p.id} delay={i * 60}>
                <div className="overflow-hidden rounded-3xl border border-ink-900/5 bg-white shadow-soft">
                  <div className={`grid lg:grid-cols-2 ${flip ? 'lg:[&>*:first-child]:order-2' : ''}`}>
                    <div className="h-64 overflow-hidden lg:h-auto">
                      <img src={p.image} alt={p.title} className="h-full w-full object-cover" loading="lazy" />
                    </div>
                    <div className="flex flex-col justify-center p-7 sm:p-10">
                      <span className="mb-4 grid h-11 w-11 place-items-center rounded-xl bg-brand-50 text-brand-700">
                        <Icon className="h-5 w-5" />
                      </span>
                      <h2 className="font-display text-2xl font-bold sm:text-3xl">{p.title}</h2>
                      <p className="mt-3 text-[15px] leading-relaxed text-ink-700">{p.summary}</p>

                      <dl className="mt-6 grid grid-cols-3 gap-4 border-y border-ink-900/5 py-4">
                        {(p.metrics || []).map((m) => (
                          <div key={m.label}>
                            <dt className="font-display text-xl font-bold text-brand-700">{m.value}</dt>
                            <dd className="text-[11.5px] leading-tight text-ink-500">{m.label}</dd>
                          </div>
                        ))}
                      </dl>

                      <p className="mt-4 text-sm text-ink-700">
                        <span className="font-semibold text-ink-900">₹{formatNumber(p.costPerUnit)}</span> {p.unitLabel}.
                      </p>

                      <div className="mt-6 flex flex-wrap gap-3">
                        <Link to={`/programs/${p.slug}`} className="btn-primary">
                          Programme detail <ArrowRight className="h-4 w-4" />
                        </Link>
                        <Link to="/donate" className="btn-ghost">
                          Fund this work
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              </Reveal>
            )
          })}
        </div>
      </section>
    </>
  )
}

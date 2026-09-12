import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight, Heart, Users, CalendarDays, ChevronDown, Sparkles, Quote, CheckCircle2,
} from 'lucide-react'
import { useContent } from '../store/useSite'
import { Reveal, Counter, SectionHeading, Badge } from '../components/ui'
import { getIcon } from '../lib/iconMap'
import { formatDate, formatNumber, isUpcoming, isYear, cn } from '../lib/utils'

export default function Home() {
  const c = useContent()
  const [openFaq, setOpenFaq] = useState(null)
  const upcoming = (c.events || []).filter((e) => isUpcoming(e.date)).sort((a, b) => new Date(a.date) - new Date(b.date))
  const featured = (c.stories || []).filter((s) => s.featured).slice(0, 3)
  const programs = (c.programs || []).slice(0, 4)

  return (
    <>
      {/* ------------------------------- HERO ------------------------------- */}
      <section className="relative overflow-hidden bg-gradient-to-br from-brand-900 via-brand-800 to-brand-700 text-white">
        <div className="absolute inset-0 bg-grid opacity-[0.06]" />
        <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-accent-500/20 blur-3xl" />
        <div className="absolute -bottom-32 -left-20 h-96 w-96 rounded-full bg-brand-400/20 blur-3xl" />

        <div className="container-page relative py-16 sm:py-24">
          <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_1fr]">
            <div className="animate-fade-up">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-xs font-semibold backdrop-blur">
                <Sparkles className="h-3.5 w-3.5 text-accent-400" />
                {c.hero.eyebrow}
              </span>
              <h1 className="mt-5 font-display text-4xl font-bold leading-[1.08] text-balance sm:text-5xl lg:text-[3.5rem]">
                {c.hero.title}
              </h1>
              <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-white/85 sm:text-base">{c.hero.subtitle}</p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link to={c.hero.primaryCta.href} className="btn-accent text-base">
                  <Heart className="h-4 w-4" /> {c.hero.primaryCta.label}
                </Link>
                <Link to={c.hero.secondaryCta.href} className="btn-outline text-base">
                  <Users className="h-4 w-4" /> {c.hero.secondaryCta.label}
                </Link>
              </div>

              <dl className="mt-10 grid max-w-lg grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-4">
                {(c.stats || []).map((s) => {
                  const Icon = getIcon(s.icon)
                  return (
                    <div key={s.id}>
                      <Icon className="mb-1.5 h-5 w-5 text-accent-400" />
                      <dt className="font-display text-2xl font-bold">
                        <Counter to={s.value} suffix={s.suffix} />
                      </dt>
                      <dd className="text-[11.5px] leading-tight text-white/70">{s.label}</dd>
                    </div>
                  )
                })}
              </dl>
            </div>

            <Reveal delay={120} className="relative">
              <div className="relative overflow-hidden rounded-3xl shadow-lift ring-1 ring-white/15">
                <img src={c.hero.image} alt="KSO volunteers at work" className="h-[420px] w-full object-cover" loading="lazy" />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-brand-900/90 to-transparent p-5">
                  <p className="text-sm font-semibold">Every rupee stays in the Tricity</p>
                  <p className="text-xs text-white/75">Audited annually · Overheads under 12%</p>
                </div>
              </div>
              <div className="absolute -bottom-6 -left-4 hidden w-56 rounded-2xl bg-white p-4 shadow-lift sm:block">
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">This month</p>
                <p className="mt-1 font-display text-lg font-bold text-ink-900">{(c.events || []).filter((e) => isUpcoming(e.date)).length} upcoming drives</p>
                <Link to="/events" className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-brand-700 hover:gap-2">
                  See events <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </Reveal>
          </div>
        </div>

        {/* partner / trust strip */}
        <div className="border-t border-white/10 bg-white/5">
          <div className="container-page flex flex-wrap items-center gap-x-8 gap-y-2 py-4 text-xs text-white/70">
            <span className="font-semibold uppercase tracking-[0.16em] text-white/50">Trusted by</span>
            {['Resident Welfare Associations', 'Govt. Schools, UT Chandigarh', 'CSR partners', 'Local dispensaries', '600+ volunteers'].map((p) => (
              <span key={p} className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-accent-400" /> {p}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ----------------------------- PROGRAMS ----------------------------- */}
      <section className="container-page py-20">
        <Reveal>
          <SectionHeading
            eyebrow="What we do"
            title="Four programmes, one neighbourhood at a time"
            sub="We keep the portfolio small on purpose — so each programme gets the attention, volunteers and reporting it deserves."
          />
        </Reveal>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {programs.map((p, i) => {
            const Icon = getIcon(p.icon)
            return (
              <Reveal key={p.id} delay={i * 90}>
                <Link
                  to={`/programs/${p.slug}`}
                  className="group flex h-full flex-col overflow-hidden rounded-2xl border border-ink-900/5 bg-white shadow-soft transition hover:-translate-y-1 hover:shadow-lift"
                >
                  <div className="relative h-40 overflow-hidden">
                    <img src={p.image} alt={p.title} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" loading="lazy" />
                    <span className="absolute left-3 top-3 grid h-9 w-9 place-items-center rounded-xl bg-white/95 text-brand-700 shadow">
                      <Icon className="h-5 w-5" />
                    </span>
                  </div>
                  <div className="flex flex-1 flex-col p-5">
                    <h3 className="font-display text-lg font-bold">{p.title}</h3>
                    <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-700">{p.summary}</p>
                    <div className="mt-4 flex items-center justify-between border-t border-ink-900/5 pt-3">
                      <span className="text-xs font-semibold text-brand-700">
                        ₹{formatNumber(p.costPerUnit)} {p.unitLabel}
                      </span>
                      <ArrowRight className="h-4 w-4 text-ink-500 transition group-hover:translate-x-1 group-hover:text-brand-700" />
                    </div>
                  </div>
                </Link>
              </Reveal>
            )
          })}
        </div>
      </section>

      {/* ------------------------------- ABOUT ------------------------------ */}
      <section className="bg-ink-900/[0.02] py-20">
        <div className="container-page grid items-center gap-12 lg:grid-cols-2">
          <Reveal>
            <div className="relative">
              <img src={c.about.image} alt="KSO field work" className="h-[440px] w-full rounded-3xl object-cover shadow-lift" loading="lazy" />
              {isYear(c.org.foundedYear) && (
                <div className="absolute -bottom-5 -right-3 rounded-2xl bg-accent-500 px-5 py-4 shadow-lift sm:-right-6">
                  <p className="font-display text-3xl font-bold text-brand-900">{c.org.foundedYear}</p>
                  <p className="text-xs font-semibold text-brand-900/80">the year we started</p>
                </div>
              )}
            </div>
          </Reveal>
          <Reveal delay={100}>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-brand-600">Who we are</p>
            <h2 className="section-title text-balance">{c.about.heading}</h2>
            <div className="prose-kso mt-5">
              {c.about.body.map((para, i) => (
                <p key={i}>{para}</p>
              ))}
            </div>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link to="/about" className="btn-primary">
                Read our story <ArrowRight className="h-4 w-4" />
              </Link>
              <Link to="/impact" className="btn-ghost">
                See our numbers
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ------------------------------ STORIES ----------------------------- */}
      {featured.length > 0 && (
        <section className="container-page py-20">
          <Reveal>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <SectionHeading eyebrow="From the field" title="Stories, not statistics" center={false} />
              <Link to="/stories" className="btn-ghost">
                All stories <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </Reveal>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {featured.map((s, i) => (
              <Reveal key={s.id} delay={i * 100}>
                <Link to={`/stories/${s.slug}`} className="group flex h-full flex-col overflow-hidden rounded-2xl border border-ink-900/5 bg-white shadow-soft transition hover:-translate-y-1 hover:shadow-lift">
                  <div className="h-48 overflow-hidden">
                    <img src={s.image} alt={s.title} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" loading="lazy" />
                  </div>
                  <div className="flex flex-1 flex-col p-5">
                    <div className="mb-2 flex items-center gap-2">
                      <Badge tone="brand">{s.category}</Badge>
                      <span className="text-[11px] text-ink-500">{formatDate(s.date)}</span>
                    </div>
                    <h3 className="font-display text-lg font-bold leading-snug">{s.title}</h3>
                    <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-700">{s.excerpt}</p>
                    <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-brand-700">
                      Read more <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-1" />
                    </span>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        </section>
      )}

      {/* ------------------------------- EVENTS ----------------------------- */}
      {upcoming.length > 0 && (
        <section className="bg-brand-900 py-20 text-white">
          <div className="container-page">
            <Reveal>
              <div className="flex flex-wrap items-end justify-between gap-4">
                <SectionHeading
                  eyebrow={<span className="text-accent-400">Join us</span>}
                  title="Upcoming events"
                  sub="Walks, camps, packing evenings — show up once and you will probably come back."
                  center={false}
                />
                <Link to="/events" className="btn-outline">
                  All events <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </Reveal>
            <div className="mt-10 grid gap-5 md:grid-cols-3">
              {upcoming.slice(0, 3).map((e, i) => (
                <Reveal key={e.id} delay={i * 90}>
                  <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur">
                    <img src={e.image} alt={e.title} className="h-40 w-full object-cover" loading="lazy" />
                    <div className="flex flex-1 flex-col p-5">
                      <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-accent-400">
                        <CalendarDays className="h-3.5 w-3.5" />
                        {formatDate(e.date, { day: 'numeric', month: 'short' })} · {e.category}
                      </div>
                      <h3 className="font-display text-lg font-bold">{e.title}</h3>
                      <p className="mt-2 flex-1 text-sm text-white/75">{e.excerpt}</p>
                      <p className="mt-3 text-xs text-white/60">{e.time} · {e.location}</p>
                      <Link to="/events" className="mt-4 inline-flex w-fit items-center gap-1 text-sm font-semibold text-accent-400 hover:gap-2">
                        Register <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ---------------------------- TESTIMONIALS -------------------------- */}
      <section className="container-page py-20">
        <Reveal>
          <SectionHeading eyebrow="In their words" title="What people say after working with us" />
        </Reveal>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {(c.testimonials || []).map((t, i) => (
            <Reveal key={t.id} delay={i * 90}>
              <figure className="relative flex h-full flex-col rounded-2xl border border-ink-900/5 bg-white p-6 shadow-soft">
                <Quote className="mb-3 h-7 w-7 text-brand-300" />
                <blockquote className="flex-1 text-[15px] leading-relaxed text-ink-700">“{t.quote}”</blockquote>
                <figcaption className="mt-5 border-t border-ink-900/5 pt-4">
                  <p className="text-sm font-semibold">{t.author}</p>
                  <p className="text-xs text-ink-500">{t.role}</p>
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ------------------------------- FAQ -------------------------------- */}
      <section className="bg-ink-900/[0.02] py-20">
        <div className="container-page grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
          <Reveal>
            <SectionHeading eyebrow="Questions" title="Things people ask before they give" center={false} />
            <p className="mt-4 text-sm text-ink-700">
              Still unsure? <Link to="/contact" className="font-semibold text-brand-700 underline">Write to us</Link> — a real
              person answers, usually within two working days. Or open the AI assistant in the corner and ask there.
            </p>
          </Reveal>
          <Reveal delay={80}>
            <div className="space-y-2.5">
              {(c.faqs || []).map((f, i) => {
                const open = openFaq === f.id
                return (
                  <div key={f.id} className="overflow-hidden rounded-2xl border border-ink-900/5 bg-white shadow-soft">
                    <button
                      onClick={() => setOpenFaq(open ? null : f.id)}
                      className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                      aria-expanded={open}
                    >
                      <span className="font-semibold">{f.q}</span>
                      <ChevronDown className={cn('h-5 w-5 shrink-0 text-ink-500 transition-transform', open && 'rotate-180')} />
                    </button>
                    {open && (
                      <div className="border-t border-ink-900/5 px-5 py-4 text-sm leading-relaxed text-ink-700 animate-fade-in">
                        {f.a}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ------------------------------- CTA -------------------------------- */}
      <section className="container-page pb-8">
        <Reveal>
          <div className="overflow-hidden rounded-3xl bg-gradient-to-r from-accent-500 to-accent-600 p-8 sm:p-12">
            <div className="flex flex-wrap items-center justify-between gap-6">
              <div className="max-w-xl">
                <h2 className="font-display text-3xl font-bold text-brand-900 sm:text-4xl">
                  Two hours a fortnight changes a child’s week.
                </h2>
                <p className="mt-3 text-[15px] text-brand-900/80">
                  Volunteer at a learning centre near you, or set up a monthly donation you can cancel any time.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link to="/donate" className="btn bg-brand-900 px-6 py-3 text-white hover:bg-brand-800">
                  <Heart className="h-4 w-4" /> Donate now
                </Link>
                <Link to="/volunteer" className="btn border border-brand-900/30 bg-white/40 px-6 py-3 text-brand-900 hover:bg-white/70">
                  <Users className="h-4 w-4" /> Volunteer
                </Link>
              </div>
            </div>
          </div>
        </Reveal>
      </section>
    </>
  )
}

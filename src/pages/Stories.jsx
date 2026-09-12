import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { useContent } from '../store/useSite'
import { Reveal, Badge, EmptyState } from '../components/ui'
import { formatDate, cn } from '../lib/utils'
import PageHero from '../components/PageHero'

export default function Stories() {
  const c = useContent()
  const stories = c.stories || []
  const [cat, setCat] = useState('All')
  const cats = useMemo(() => ['All', ...Array.from(new Set(stories.map((s) => s.category).filter(Boolean)))], [stories])
  const shown = cat === 'All' ? stories : stories.filter((s) => s.category === cat)
  const [first, ...rest] = shown

  return (
    <>
      <PageHero
        eyebrow="Stories"
        title="What the work looks like from the inside"
        text="Field notes, case studies and the occasional honest account of what did not work."
        crumb="Stories"
      />

      <section className="container-page py-14">
        <div className="mb-8 flex flex-wrap gap-2">
          {cats.map((t) => (
            <button
              key={t}
              onClick={() => setCat(t)}
              className={cn(
                'rounded-full px-4 py-2 text-sm font-semibold transition',
                cat === t ? 'bg-brand-700 text-white' : 'border border-ink-900/10 bg-white text-ink-700 hover:bg-ink-900/5',
              )}
            >
              {t}
            </button>
          ))}
        </div>

        {shown.length === 0 ? (
          <EmptyState title="No stories yet" text="Write your first one in Admin → Content → Stories." />
        ) : (
          <>
            <Reveal>
              <Link to={`/stories/${first.slug}`} className="group grid overflow-hidden rounded-3xl border border-ink-900/5 bg-white shadow-soft lg:grid-cols-2">
                <div className="h-64 overflow-hidden lg:h-full lg:min-h-[340px]">
                  <img src={first.image} alt={first.title} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                </div>
                <div className="flex flex-col justify-center p-7 sm:p-10">
                  <div className="mb-3 flex items-center gap-2">
                    <Badge tone="accent">Featured</Badge>
                    <Badge tone="brand">{first.category}</Badge>
                    <span className="text-xs text-ink-500">{formatDate(first.date)}</span>
                  </div>
                  <h2 className="font-display text-2xl font-bold leading-snug sm:text-3xl">{first.title}</h2>
                  <p className="mt-3 text-[15px] leading-relaxed text-ink-700">{first.excerpt}</p>
                  <span className="mt-6 inline-flex items-center gap-1.5 font-semibold text-brand-700">
                    Read the story <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                  </span>
                </div>
              </Link>
            </Reveal>

            <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {rest.map((s, i) => (
                <Reveal key={s.id} delay={i * 70}>
                  <Link to={`/stories/${s.slug}`} className="group flex h-full flex-col overflow-hidden rounded-2xl border border-ink-900/5 bg-white shadow-soft transition hover:-translate-y-1 hover:shadow-lift">
                    <div className="h-44 overflow-hidden">
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
          </>
        )}
      </section>
    </>
  )
}

import { Link, useParams, Navigate } from 'react-router-dom'
import { ArrowLeft, Share2, CalendarDays, User } from 'lucide-react'
import { useContent } from '../store/useSite'
import { Reveal, Badge, useToast } from '../components/ui'
import { formatDate, copyToClipboard } from '../lib/utils'
import PageHero from '../components/PageHero'

export default function StoryDetail() {
  const { slug } = useParams()
  const c = useContent()
  const toast = useToast()
  const story = (c.stories || []).find((s) => s.slug === slug)
  if (!story) return <Navigate to="/stories" replace />
  const more = (c.stories || []).filter((s) => s.slug !== slug).slice(0, 3)

  const share = async () => {
    const ok = await copyToClipboard(window.location.href)
    toast(ok ? 'Link copied to clipboard' : 'Copy failed — select the address bar', ok ? 'success' : 'error')
  }

  return (
    <>
      <PageHero eyebrow={story.category} title={story.title} crumb="Stories" image={story.image} />

      <article className="container-page py-12">
        <div className="mx-auto max-w-3xl">
          <Reveal>
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3 text-sm text-ink-500">
              <span className="flex flex-wrap items-center gap-4">
                <span className="flex items-center gap-1.5"><CalendarDays className="h-4 w-4" /> {formatDate(story.date, { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                <span className="flex items-center gap-1.5"><User className="h-4 w-4" /> {story.author}</span>
              </span>
              <button onClick={share} className="flex items-center gap-1.5 font-semibold text-brand-700 hover:underline">
                <Share2 className="h-4 w-4" /> Share
              </button>
            </div>

            <img src={story.image} alt={story.title} className="mb-8 max-h-[420px] w-full rounded-3xl object-cover shadow-lift" />

            <div className="prose-kso max-w-none">
              {String(story.body).split('\n\n').map((p, i) => (
                <p key={i} className={i === 0 ? 'text-lg leading-relaxed text-ink-900' : undefined}>{p}</p>
              ))}
            </div>

            <div className="mt-10 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-brand-50/70 p-6">
              <div>
                <p className="font-display text-lg font-bold">Stories like this are funded by donors like you.</p>
                <p className="text-sm text-ink-700">Monthly giving is what lets us plan a year ahead.</p>
              </div>
              <Link to="/donate" className="btn-primary">Donate now</Link>
            </div>

            <Link to="/stories" className="mt-8 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:gap-2.5">
              <ArrowLeft className="h-4 w-4" /> All stories
            </Link>
          </Reveal>
        </div>
      </article>

      {more.length > 0 && (
        <section className="bg-ink-900/[0.02] py-12">
          <div className="container-page">
            <h2 className="font-display text-2xl font-bold">Keep reading</h2>
            <div className="mt-6 grid gap-5 sm:grid-cols-3">
              {more.map((s) => (
                <Link key={s.id} to={`/stories/${s.slug}`} className="group overflow-hidden rounded-2xl border border-ink-900/5 bg-white shadow-soft transition hover:-translate-y-1 hover:shadow-lift">
                  <img src={s.image} alt={s.title} className="h-36 w-full object-cover" loading="lazy" />
                  <div className="p-5">
                    <Badge tone="brand">{s.category}</Badge>
                    <h3 className="mt-2 font-display text-base font-bold leading-snug">{s.title}</h3>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  )
}

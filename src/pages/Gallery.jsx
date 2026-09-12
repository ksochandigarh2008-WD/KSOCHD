import { useState } from 'react'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'
import { useContent } from '../store/useSite'
import { Reveal } from '../components/ui'
import { cn } from '../lib/utils'
import PageHero from '../components/PageHero'

export default function Gallery() {
  const c = useContent()
  const g = c.gallery || {}
  const images = g.images || []
  const [open, setOpen] = useState(null)
  const [tag, setTag] = useState('All')
  const tags = ['All', ...Array.from(new Set(images.map((i) => i.tag).filter(Boolean)))]
  const shown = tag === 'All' ? images : images.filter((i) => i.tag === tag)

  const move = (dir) => {
    if (open === null) return
    setOpen((i) => (i + dir + shown.length) % shown.length)
  }

  return (
    <>
      <PageHero eyebrow="Gallery" title={g.heading || 'From the field'} text="Unfiltered photos from camps, classes and drives." crumb="Gallery" />

      <section className="container-page py-14">
        <div className="mb-8 flex flex-wrap gap-2">
          {tags.map((t) => (
            <button
              key={t}
              onClick={() => { setTag(t); setOpen(null) }}
              className={cn(
                'rounded-full px-4 py-2 text-sm font-semibold transition',
                tag === t ? 'bg-brand-700 text-white' : 'border border-ink-900/10 bg-white text-ink-700 hover:bg-ink-900/5',
              )}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="columns-1 gap-4 sm:columns-2 lg:columns-3 [&>div]:mb-4">
          {shown.map((img, i) => (
            <div key={img.id} className="break-inside-avoid">
              <Reveal delay={Math.min(i * 50, 300)}>
                <button
                  onClick={() => setOpen(i)}
                  className="group relative block w-full overflow-hidden rounded-2xl shadow-soft"
                >
                  <img src={img.src} alt={img.caption} className="w-full object-cover transition duration-500 group-hover:scale-[1.03]" loading="lazy" />
                  <span className="absolute inset-x-0 bottom-0 translate-y-full bg-gradient-to-t from-ink-900/90 to-transparent p-3 text-left text-xs font-medium text-white transition group-hover:translate-y-0">
                    {img.caption}
                  </span>
                </button>
              </Reveal>
            </div>
          ))}
        </div>
      </section>

      {open !== null && shown[open] && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center bg-ink-900/90 p-4 backdrop-blur">
          <button onClick={() => setOpen(null)} className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
          <button onClick={() => move(-1)} className="absolute left-3 rounded-full bg-white/10 p-3 text-white hover:bg-white/20" aria-label="Previous">
            <ChevronLeft className="h-6 w-6" />
          </button>
          <figure className="max-h-[85vh] max-w-4xl animate-fade-in">
            <img src={shown[open].src} alt={shown[open].caption} className="max-h-[75vh] w-full rounded-2xl object-contain" />
            <figcaption className="mt-3 text-center text-sm text-white/80">{shown[open].caption}</figcaption>
          </figure>
          <button onClick={() => move(1)} className="absolute right-3 rounded-full bg-white/10 p-3 text-white hover:bg-white/20" aria-label="Next">
            <ChevronRight className="h-6 w-6" />
          </button>
        </div>
      )}
    </>
  )
}

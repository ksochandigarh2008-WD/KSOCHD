import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'

export default function PageHero({ eyebrow, title, text, crumb, image }) {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-brand-900 via-brand-800 to-brand-700 text-white">
      <div className="absolute inset-0 bg-grid opacity-[0.05]" />
      <div className="absolute -right-20 top-0 h-72 w-72 rounded-full bg-accent-500/20 blur-3xl" />
      {image && <img src={image} alt="" className="absolute inset-0 h-full w-full object-cover opacity-20" />}
      <div className="container-page relative py-14 sm:py-20">
        {crumb && (
          <nav className="mb-4 flex items-center gap-1 text-xs text-white/60">
            <Link to="/" className="hover:text-white">Home</Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-white/90">{crumb}</span>
          </nav>
        )}
        {eyebrow && (
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-accent-400">{eyebrow}</p>
        )}
        <h1 className="max-w-3xl font-display text-3xl font-bold leading-tight text-balance sm:text-[2.75rem]">
          {title}
        </h1>
        {text && <p className="mt-4 max-w-2xl text-[15px] text-white/80">{text}</p>}
      </div>
    </section>
  )
}

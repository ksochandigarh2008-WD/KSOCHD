import { useState, useEffect } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { Menu, X, Heart, LayoutDashboard, Sparkles } from 'lucide-react'
import { useContent, useSite } from '../../store/useSite'
import { cn } from '../../lib/utils'

const links = [
  { to: '/about', label: 'About' },
  { to: '/programs', label: 'Programmes' },
  { to: '/impact', label: 'Impact' },
  { to: '/stories', label: 'Stories' },
  { to: '/events', label: 'Events' },
  { to: '/gallery', label: 'Gallery' },
  { to: '/volunteer', label: 'Volunteer' },
]

export default function Navbar() {
  const content = useContent()
  const org = content.org
  const settings = useSite((s) => s.settings)
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const { pathname } = useLocation()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => setOpen(false), [pathname])

  return (
    <header
      className={cn(
        'sticky top-0 z-50 transition-all duration-300',
        scrolled ? 'border-b border-ink-900/5 bg-white/85 backdrop-blur-md' : 'bg-transparent',
      )}
    >
      {/* Top utility bar */}
      <div className="hidden bg-brand-900 text-white/90 md:block">
        <div className="container-page flex items-center justify-between py-1.5 text-xs">
          <p className="flex items-center gap-2">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-accent-400" />
            {org.tagline} · {org.area}
          </p>
          <div className="flex items-center gap-4">
            <a href={`tel:${org.phone}`} className="hover:text-accent-400">{org.phone}</a>
            <a href={`mailto:${org.email}`} className="hover:text-accent-400">{org.email}</a>
            <Link to="/admin" className="flex items-center gap-1 font-semibold hover:text-accent-400">
              <LayoutDashboard className="h-3.5 w-3.5" /> Admin
            </Link>
          </div>
        </div>
      </div>

      <div className="container-page flex h-16 items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-2.5">
          {settings.logo ? (
            <img src={settings.logo} alt={org.shortName} className="h-9 w-auto rounded-lg object-contain" />
          ) : (
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-accent-500 to-brand-700 font-display text-sm font-bold text-white shadow-soft">
              {org.shortName.slice(0, 3)}
            </span>
          )}
          <span className="leading-tight">
            <span className="block font-display text-[17px] font-bold">{org.shortName}</span>
            <span className="hidden text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-500 sm:block">
              {org.city}
            </span>
          </span>
        </Link>

        <nav className="hidden items-center gap-0.5 lg:flex">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) =>
                cn(
                  'rounded-full px-3.5 py-2 text-sm font-medium transition',
                  isActive ? 'bg-brand-50 text-brand-700' : 'text-ink-700 hover:bg-ink-900/5',
                )
              }
            >
              {l.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            to="/donate"
            className="btn-primary hidden sm:inline-flex"
            aria-label="Donate to KSO"
          >
            <Heart className="h-4 w-4" /> Donate
          </Link>
          <button
            onClick={() => setOpen((v) => !v)}
            className="rounded-xl border border-ink-900/10 p-2 lg:hidden"
            aria-label="Toggle menu"
            aria-expanded={open}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="border-t border-ink-900/5 bg-white lg:hidden">
          <nav className="container-page grid gap-1 py-3">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                className={({ isActive }) =>
                  cn('rounded-xl px-3 py-2.5 text-sm font-medium', isActive ? 'bg-brand-50 text-brand-700' : 'text-ink-700 hover:bg-ink-900/5')
                }
              >
                {l.label}
              </NavLink>
            ))}
            <Link to="/donate" className="btn-primary mt-2">
              <Heart className="h-4 w-4" /> Donate
            </Link>
            <Link to="/admin" className="btn-ghost">
              <LayoutDashboard className="h-4 w-4" /> Admin panel
            </Link>
          </nav>
        </div>
      )}
    </header>
  )
}

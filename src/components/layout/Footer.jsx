import { Link } from 'react-router-dom'
import { Facebook, Instagram, Twitter, Youtube, Linkedin, Mail, Phone, MapPin, ArrowUpRight } from 'lucide-react'
import { useContent, useSite } from '../../store/useSite'
import { REOPEN_EVENT, analyticsIdFor } from '../../lib/analytics'
import { formatDate } from '../../lib/utils'

const socialIcon = { Facebook, Instagram, Twitter, Youtube, Linkedin }

export default function Footer() {
  const settings = useSite((s) => s.settings)
  const analyticsOn = Boolean(analyticsIdFor(settings))
  const c = useContent()
  const org = c.org
  const year = new Date().getFullYear()

  return (
    <footer className="mt-24 bg-brand-900 text-white">
      <div className="container-page py-14">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-1">
            <p className="font-display text-2xl font-bold">{org.shortName}</p>
            <p className="mt-1 text-sm text-white/70">{org.fullName}</p>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-white/70">
              {org.tagline}. Working across {org.area} since {org.foundedYear}.
            </p>
            <div className="mt-5 flex gap-2">
              {Object.entries(org.social || {}).map(([k, url]) => {
                const Icon = socialIcon[k.charAt(0).toUpperCase() + k.slice(1)]
                if (!Icon || !url) return null
                return (
                  <a
                    key={k}
                    href={url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="grid h-9 w-9 place-items-center rounded-xl bg-white/10 transition hover:bg-accent-500 hover:text-brand-900"
                    aria-label={k}
                  >
                    <Icon className="h-4 w-4" />
                  </a>
                )
              })}
            </div>
          </div>

          <div>
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-white/50">Explore</p>
            <ul className="space-y-2 text-sm text-white/80">
              {[
                ['About us', '/about'],
                ['Programmes', '/programs'],
                ['Impact & reports', '/impact'],
                ['Events', '/events'],
                ['Stories', '/stories'],
                ['Gallery', '/gallery'],
              ].map(([label, to]) => (
                // keyed on label AND link: two entries may point at the same page,
                // and a duplicate key silently drops one of them
                <li key={`${label}-${to}`}>
                  <Link to={to} className="hover:text-accent-400">{label}</Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-white/50">Get involved</p>
            <ul className="space-y-2 text-sm text-white/80">
              {[
                ['Donate', '/donate'],
                ['Volunteer with us', '/volunteer'],
                ['Corporate partnerships', '/contact?topic=partnership'],
                ['Contact', '/contact'],
                ['Admin panel', '/admin'],
              ].map(([label, to]) => (
                <li key={to}>
                  <Link to={to} className="inline-flex items-center gap-1 hover:text-accent-400">
                    {label} <ArrowUpRight className="h-3.5 w-3.5" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-white/50">Reach us</p>
            <ul className="space-y-3 text-sm text-white/80">
              <li className="flex gap-2.5">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-accent-400" />
                <span>{org.address}</span>
              </li>
              <li className="flex gap-2.5">
                <Phone className="h-4 w-4 shrink-0 text-accent-400" />
                <a href={`tel:${org.phone}`} className="hover:text-accent-400">{org.phone}</a>
              </li>
              <li className="flex gap-2.5">
                <Mail className="h-4 w-4 shrink-0 text-accent-400" />
                <a href={`mailto:${org.email}`} className="hover:text-accent-400">{org.email}</a>
              </li>
            </ul>
            <p className="mt-4 text-xs text-white/50">{org.hours}</p>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-white/10 pt-6 text-xs text-white/60 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {year} {org.fullName}. A registered non-profit organisation. All donations are issued a receipt.
          </p>
          <p className="flex flex-wrap gap-x-4 gap-y-1">
            <span>{org.registration}</span>
            <span>{org.taxExemption}</span>
            {analyticsOn && (
              <button
                type="button"
                onClick={() => window.dispatchEvent(new Event(REOPEN_EVENT))}
                className="underline hover:text-white"
              >
                Privacy choices
              </button>
            )}
          </p>
        </div>
      </div>
    </footer>
  )
}

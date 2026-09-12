import { Link } from 'react-router-dom'
import { Hammer, Lock } from 'lucide-react'
import { useSite } from '../store/useSite'
import { maintenanceCopy } from '../lib/production'

const NAVY = '#1e3a6e'
const CREAM = '#faf6ee'

/**
 * What visitors see while maintenance mode is on.
 *
 * Signed-in admins never see this — they get the real site, so they can check their
 * own work. The holding page keeps the organisation name, phone and email visible:
 * someone looking for a helpline should still find it.
 */
export default function MaintenanceScreen() {
  const settings = useSite((s) => s.settings)
  const org = useSite((s) => s.content.org)
  const { heading, message } = maintenanceCopy(settings)

  return (
    <div className="grid min-h-screen place-items-center px-4" style={{ background: CREAM }}>
      <div className="w-full max-w-lg text-center">
        {settings.logo ? (
          <img src={settings.logo} alt="" className="mx-auto mb-6 h-20 w-20 rounded-2xl object-cover" />
        ) : (
          <div
            className="mx-auto mb-6 grid h-16 w-16 place-items-center rounded-2xl text-xl font-bold text-white"
            style={{ background: NAVY }}
          >
            {String(org.shortName || 'KSO').slice(0, 3)}
          </div>
        )}

        <div
          className="mb-5 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wide"
          style={{ background: 'rgba(30,58,110,0.08)', color: NAVY }}
        >
          <Hammer className="h-3 w-3" /> Maintenance
        </div>

        <h1 className="font-display text-3xl font-bold" style={{ color: NAVY }}>
          {heading}
        </h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-ink-600">{message}</p>

        <div className="mt-8 rounded-2xl border border-black/5 bg-white p-5 text-left">
          <p className="font-display text-base font-bold">{org.fullName}</p>
          {org.registration && <p className="mt-0.5 text-xs text-ink-500">Regd. {org.registration}</p>}
          <p className="mt-3 text-sm text-ink-600">{org.address}</p>
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm">
            {org.phone && (
              <a href={`tel:${org.phone}`} className="font-semibold hover:underline" style={{ color: NAVY }}>
                {org.phone}
              </a>
            )}
            {org.email && (
              <a href={`mailto:${org.email}`} className="font-semibold hover:underline" style={{ color: NAVY }}>
                {org.email}
              </a>
            )}
          </div>
        </div>

        <Link
          to="/admin"
          className="mt-6 inline-flex items-center gap-1.5 text-xs font-semibold text-ink-500 hover:text-ink-700"
        >
          <Lock className="h-3.5 w-3.5" /> Team sign in
        </Link>
      </div>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { BarChart3, X } from 'lucide-react'
import { useSite } from '../store/useSite'
import { getConsent, setConsent, analyticsIdFor, analyticsProviderFor, REOPEN_EVENT as EVENT } from '../lib/analytics'

/**
 * Asks once, remembers the answer, and only ever loads a script after "Allow".
 *
 * There is no dark pattern here: Decline is as easy as Allow, and declining leaves no
 * third-party request on the page at all.
 */
export default function ConsentBanner() {
  const settings = useSite((s) => s.settings)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // The footer's "Privacy choices" link re-opens the banner after the first answer.
    const reopen = () => setVisible(true)
    window.addEventListener(EVENT, reopen)
    if (analyticsIdFor(settings) && getConsent() === null) setVisible(true)
    return () => window.removeEventListener(EVENT, reopen)
  }, [settings])

  if (!visible) return null

  const answer = (choice) => {
    const previous = getConsent()
    setConsent(choice)
    setVisible(false)
    // Reloading is the simplest way to guarantee the tag is present (or absent) exactly
    // once, rather than racing the banner — including when someone revokes consent.
    if (choice !== previous && (choice === 'granted' || previous === 'granted')) {
      window.location.reload()
    }
  }

  const provider = analyticsProviderFor(settings)

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-ink-900/10 bg-white/95 px-4 py-3 backdrop-blur">
      <div className="mx-auto flex max-w-5xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-start gap-2 text-xs leading-relaxed text-ink-600">
          <BarChart3 className="mt-0.5 h-4 w-4 shrink-0 text-ink-400" />
          <span>
            We would like to use {provider === 'plausible' ? 'Plausible' : 'Google Analytics'} to see
            which pages help people find us. Nothing is loaded until you agree.
          </span>
        </p>
        <div className="flex shrink-0 gap-2">
          <button
            onClick={() => answer('denied')}
            className="rounded-lg border border-ink-900/10 px-3 py-1.5 text-xs font-semibold text-ink-600 hover:bg-ink-900/[0.03]"
          >
            Decline
          </button>
          <button
            onClick={() => answer('granted')}
            className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700"
          >
            Allow
          </button>
        </div>
      </div>
    </div>
  )
}

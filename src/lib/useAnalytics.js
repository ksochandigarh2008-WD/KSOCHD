import { useEffect } from 'react'
import { shouldLoadAnalytics, analyticsScript, analyticsIdFor, analyticsProviderFor } from './analytics'

/**
 * Injects the analytics tag once consent and configuration are both present.
 *
 * The tag is appended straight to <head> rather than through a bundler import, so it is
 * never downloaded by someone who has not agreed (or by anyone at all when analytics is
 * switched off).
 */
export function useAnalytics(settings) {
  useEffect(() => {
    const script = analyticsScript({
      provider: analyticsProviderFor(settings),
      id: analyticsIdFor(settings),
      domain: settings?.analytics?.domain,
    })
    if (!script) return
    if (!shouldLoadAnalytics(settings)) return
    if (document.getElementById(`analytics-${script.id}`)) return

    const tag = document.createElement('script')
    tag.id = `analytics-${script.id}`
    tag.src = script.src
    tag.async = Boolean(script.async)
    if (script.defer) tag.defer = true
    Object.entries(script.attrs || {}).forEach(([k, v]) => tag.setAttribute(k, v))
    if (script.inline) {
      const inline = document.createElement('script')
      inline.textContent = script.inline
      document.head.appendChild(inline)
    }
    document.head.appendChild(tag)
  }, [settings])
}

/**
 * Analytics, behind consent.
 *
 * Two decisions worth writing down:
 *
 * 1. **Nothing loads until the visitor agrees.** Scripts are injected only after consent
 *    is granted, and declining is a real answer — the site works identically without it.
 *    The choice is stored locally and can be changed from the footer link.
 * 2. **The ID is a setting, not an env var only.** The admin can paste a Measurement ID
 *    without a redeploy; `VITE_ANALYTICS_ID` remains as a fallback for teams that would
 *    rather keep it out of the CMS.
 */

export const CONSENT_KEY = 'kso-analytics-consent'

/** Dispatched by the footer's "Privacy choices" link to re-open the banner. */
export const REOPEN_EVENT = 'kso-privacy-choices'

export const defaultAnalytics = () => ({
  provider: 'none', // 'none' | 'ga4' | 'plausible'
  id: '',
  domain: '',
})

/**
 * The <script> to inject, or null when analytics should stay switched off.
 * Kept pure so it can be tested without a browser.
 */
export function analyticsScript({ provider, id, domain } = {}) {
  const cleanId = String(id || '').trim()
  if (!cleanId) return null

  if (provider === 'ga4') {
    return {
      src: `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(cleanId)}`,
      async: true,
      id: 'ga4',
      inline: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${cleanId}')`,
    }
  }

  if (provider === 'plausible') {
    return {
      src: 'https://plausible.io/js/script.js',
      async: true,
      defer: true,
      id: 'plausible',
      attrs: { 'data-domain': String(domain || '').trim() || window.location.hostname },
    }
  }

  return null
}

/** Env var is the fallback; the setting wins so it can be changed without a rebuild. */
export const analyticsIdFor = (settings) =>
  String(settings?.analytics?.id || '').trim() ||
  String(import.meta.env?.VITE_ANALYTICS_ID || '').trim()

export const analyticsProviderFor = (settings) =>
  settings?.analytics?.provider || (analyticsIdFor(settings) ? 'ga4' : 'none')

/* --------------------------------- consent -------------------------------- */

export const getConsent = () => {
  try {
    return localStorage.getItem(CONSENT_KEY) // 'granted' | 'denied' | null
  } catch {
    return null // private browsing: treat as unanswered, ask again next time
  }
}

export const setConsent = (value) => {
  try {
    localStorage.setItem(CONSENT_KEY, value)
  } catch {
    /* nothing to persist to — the choice lasts for this page view only */
  }
}

/** Whether the visitor has been asked yet. */
export const consentUnanswered = () => getConsent() === null

/** Analytics runs only when configured AND permitted. */
export const shouldLoadAnalytics = (settings) =>
  Boolean(analyticsScript({
    provider: analyticsProviderFor(settings),
    id: analyticsIdFor(settings),
    domain: settings?.analytics?.domain,
  })) && getConsent() === 'granted'

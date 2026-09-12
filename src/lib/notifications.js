/**
 * Delivering submissions to a human.
 *
 * A browser cannot send email — there is no SMTP in the platform, and putting a
 * mail provider's API key in a static bundle would publish it to anyone who opens
 * devtools. So delivery is delegated: you paste a URL that accepts a POST
 * (Formspree, Zapier/Make, n8n, a Supabase Edge Function, your own endpoint) and
 * the site hands the submission over. Nothing is sent until that URL is set.
 */
/** Fresh object every call, so no caller can hand the same nested object around. */
export const defaultNotifications = () => ({
  webhookUrl: '',
  notifyOnSubmission: true,
  notifyOnDonation: true,
})

const payloadFor = (submission) => ({
  kind: submission.kind || 'contact',
  name: submission.name || '',
  email: submission.email || '',
  phone: submission.phone || '',
  message: submission.message || '',
  receivedAt: submission.date || new Date().toISOString(),
})

/**
 * Fire-and-forget: a failed delivery must never lose the submission itself, which is
 * already stored in the Inbox. Returns a result so callers can surface a problem.
 */
export async function deliverSubmission(submission, notifications = {}) {
  if (notifications.notifyOnSubmission === false) return { skipped: 'notifications turned off' }
  if (submission.kind === 'donation' && notifications.notifyOnDonation === false) return { skipped: 'donation notices off' }
  const url = String(notifications.webhookUrl || '').trim()
  if (!url) return { skipped: 'no delivery URL configured' }
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payloadFor(submission)),
    })
    return res.ok ? { ok: true } : { ok: false, error: `Endpoint replied ${res.status}` }
  } catch (e) {
    return { ok: false, error: e?.message || 'Network error' }
  }
}

/** Used by the "send a test" button in Admin → System. */
export async function sendTestNotification(url) {
  const clean = String(url || '').trim()
  if (!clean) return { ok: false, error: 'Paste a URL first' }
  if (!/^https?:\/\//i.test(clean)) return { ok: false, error: 'The URL should start with https://' }
  try {
    const res = await fetch(clean, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind: 'test', name: 'KSO website', message: 'This is a test submission from the admin panel.' }),
    })
    return res.ok ? { ok: true } : { ok: false, error: `Endpoint replied ${res.status}` }
  } catch (e) {
    return { ok: false, error: e?.message || 'Blocked — the endpoint may not allow browser requests (CORS)' }
  }
}

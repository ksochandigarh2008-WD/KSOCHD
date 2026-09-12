/**
 * REST TIER
 * ---------
 * Optional HTTP backend for the content store, submissions and the membership +
 * finance systems. Set VITE_API_BASE_URL and `src/lib/db.js` routes through here
 * automatically; with the variable unset every call resolves to `null` and the
 * app falls back to the local store. Nothing ever throws at the call site.
 *
 * Expected endpoints (all JSON):
 *   GET    /content                 -> full content object
 *   PUT    /content                 -> save full content object
 *   GET    /members                 -> membership records
 *   POST   /members                 -> { ...record }        -> created record
 *   PATCH  /members/:id             -> { ...patch }         -> updated record
 *   DELETE /members/:id
 *   GET    /transactions            -> ledger rows
 *   POST   /transactions            -> { ...row }           -> created row
 *   PATCH  /transactions/:id        -> { ...patch }
 *   DELETE /transactions/:id
 *   GET    /pledges   (+ POST / PATCH / DELETE)
 *   GET    /budgets   (+ POST / PATCH / DELETE)
 *   POST   /submissions             -> contact / volunteer / event / donation payloads
 *   POST   /ai/chat                 -> { messages, context } -> { reply }
 *                                      (recommended: proxy the LLM server-side so the
 *                                       API key never reaches the browser)
 */

const BASE = import.meta.env.VITE_API_BASE_URL || ''

export const isApiMode = Boolean(BASE)

/** Run a REST call when configured; return null on any failure so callers fall back. */
export async function tryRemote(fn) {
  if (!isApiMode) return null
  try {
    return await fn()
  } catch (err) {
    if (import.meta.env.DEV) console.warn('[api] falling back to local store:', err.message)
    return null
  }
}

async function request(path, options = {}) {
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('kso-admin-token') : null
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
    ...options,
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`${res.status} ${res.statusText} ${text}`.trim())
  }
  const ct = res.headers.get('content-type') || ''
  return ct.includes('application/json') ? res.json() : res.text()
}

/** CRUD helper for a REST resource. */
function resource(path) {
  return {
    list: () => tryRemote(() => request(`/${path}`)),
    create: (row) => tryRemote(() => request(`/${path}`, { method: 'POST', body: JSON.stringify(row) })),
    update: (id, patch) => tryRemote(() => request(`/${path}/${id}`, { method: 'PATCH', body: JSON.stringify(patch) })),
    remove: (id) => tryRemote(() => request(`/${path}/${id}`, { method: 'DELETE' })),
  }
}

export const api = {
  content: {
    get: () => tryRemote(() => request('/content')),
    save: (content) => tryRemote(() => request('/content', { method: 'PUT', body: JSON.stringify(content) })),
  },
  // membership + finance resources consumed by src/lib/db.js
  members: resource('members'),
  transactions: resource('transactions'),
  pledges: resource('pledges'),
  budgets: resource('budgets'),
  // double-entry books
  accounts: resource('accounts'),
  vouchers: resource('vouchers'),
  grants: resource('grants'),
  receipts: resource('receipts'),
  feeReceipts: resource('feeReceipts'),
  submissions: {
    create: (row) => tryRemote(() => request('/submissions', { method: 'POST', body: JSON.stringify(row) })),
  },
  ai: {
    chat: (payload) => tryRemote(() => request('/ai/chat', { method: 'POST', body: JSON.stringify(payload) })),
  },
}

export default api

export const cn = (...parts) => parts.filter(Boolean).join(' ')

export const uid = (prefix = 'id') =>
  `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`

export const slugify = (str = '') =>
  str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 60)

const inrFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
})

export const formatCurrency = (n = 0) => inrFormatter.format(Number(n) || 0)

/** Two-letter avatar initials: "Harpreet Singh" → "HS". */
export const initials = (name = '') =>
  name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '—'

export const formatCompact = (n = 0) => {
  const v = Number(n) || 0
  if (v >= 1e7) return `₹${(v / 1e7).toFixed(2)} Cr`
  if (v >= 1e5) return `₹${(v / 1e5).toFixed(2)} L`
  if (v >= 1e3) return `₹${(v / 1e3).toFixed(1)}K`
  return `₹${v}`
}

export const formatNumber = (n = 0) => new Intl.NumberFormat('en-IN').format(Number(n) || 0)

export const formatDate = (iso, opts = { day: 'numeric', month: 'short', year: 'numeric' }) => {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return String(iso)
  return d.toLocaleDateString('en-IN', opts)
}

export const isUpcoming = (iso) => {
  if (!iso) return false
  return new Date(iso).getTime() >= new Date(new Date().toDateString()).getTime()
}

export const hexToRgb = (hex) => {
  const clean = String(hex).replace('#', '').trim()
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((c) => c + c)
          .join('')
      : clean.padEnd(6, '0').slice(0, 6)
  const num = parseInt(full, 16)
  if (Number.isNaN(num)) return null
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 }
}

export const hexToRgbString = (hex) => {
  const c = hexToRgb(hex)
  return c ? `${c.r} ${c.g} ${c.b}` : null
}

export const mixHex = (hex, target, amount) => {
  const a = hexToRgb(hex)
  const b = hexToRgb(target)
  if (!a || !b) return hex
  const ch = (x, y) => Math.round(x + (y - x) * amount)
  const toHex = (n) => n.toString(16).padStart(2, '0')
  return `#${toHex(ch(a.r, b.r))}${toHex(ch(a.g, b.g))}${toHex(ch(a.b, b.b))}`
}

export const get = (obj, path, fallback = undefined) =>
  path.split('.').reduce((acc, key) => (acc == null ? undefined : acc[key]), obj) ?? fallback

export const setImmutable = (obj, path, value) => {
  const keys = path.split('.')
  const clone = Array.isArray(obj) ? [...obj] : { ...obj }
  let node = clone
  for (let i = 0; i < keys.length - 1; i++) {
    const k = keys[i]
    node[k] = node[k] && typeof node[k] === 'object' ? (Array.isArray(node[k]) ? [...node[k]] : { ...node[k] }) : {}
    node = node[k]
  }
  node[keys[keys.length - 1]] = value
  return clone
}

export const downloadFile = (filename, content, type = 'application/json') => {
  const blob = content instanceof Blob ? content : new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1500)
}

export const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

/**
 * A founding year is four digits or it is not a year at all.
 *
 * `defaultContent.js` ships `foundedYear: '— confirm founding year —'` so the admin
 * panel can show it as a to-do. That string was rendering verbatim on the public
 * home page, About page, footer and even inside the assistant's answers — a note to
 * the editor shown to visitors. The admin panel already validates against this exact
 * rule (see `schemas.js`), so the public render sites now use it too: no year, no
 * claim, rather than a placeholder pretending to be one.
 */
export const isYear = (value) => /^\d{4}$/.test(String(value ?? '').trim())

export const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(email || '').trim())

export const validatePhone = (phone) =>
  /^(\+?91[- ]?)?[6-9]\d{9}$/.test(String(phone || '').replace(/[\s-]/g, ''))

export const readFileAsDataURL = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })

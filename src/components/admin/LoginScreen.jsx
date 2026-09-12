import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Eye, EyeOff, ArrowLeft, LogIn, ShieldAlert } from 'lucide-react'
import { useSite } from '../../store/useSite'

/**
 * Admin sign-in.
 *
 * Deliberately plain CSS rather than Tailwind palette utilities: the portal uses
 * the KSO navy-on-cream palette (--navy / --cream below) while the rest of the
 * site stays on the teal brand, and this keeps the two from bleeding together.
 */

const NAVY = '#1e3a6e'
const CREAM = '#faf6ee'

export default function LoginScreen({ onAuthed }) {
  const login = useSite((s) => s.login)
  const org = useSite((s) => s.content.org)
  const settings = useSite((s) => s.settings)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = (e) => {
    e.preventDefault()
    setError('')
    if (!email.trim() || !password) return setError('Enter your email and password.')
    setBusy(true)
    // Tiny delay keeps the button from flickering and makes brute force tedious.
    setTimeout(() => {
      const ok = login(email, password)
      setBusy(false)
      if (ok) {
        setEmail(''); setPassword('')
        onAuthed?.()
      } else {
        setError('Those details do not match an account.')
      }
    }, 220)
  }

  return (
    <div
      className="grid min-h-screen place-items-center p-4"
      style={{ background: `linear-gradient(160deg, ${CREAM} 0%, #f3ece0 100%)` }}
    >
      <div className="w-full max-w-[26rem]">
        <div
          className="rounded-2xl border border-black/5 bg-white p-8"
          style={{ boxShadow: '0 20px 45px -20px rgba(30,58,110,.28), 0 2px 6px rgba(30,58,110,.06)' }}
        >
          {/* Identity */}
          <div className="text-center">
            {settings.logo ? (
              <img
                src={settings.logo}
                alt={org.shortName}
                className="mx-auto h-20 w-20 rounded-xl object-contain"
              />
            ) : (
              <span
                className="mx-auto grid h-20 w-20 place-items-center rounded-xl text-2xl font-bold text-white"
                style={{ background: NAVY }}
              >
                {org.shortName.slice(0, 3).toUpperCase()}
              </span>
            )}

            <h1 className="mt-4 font-display text-xl font-bold leading-tight" style={{ color: NAVY }}>
              {org.fullName}
            </h1>
            <p className="mt-1 text-xs font-semibold text-ink-500">{org.registration}</p>
            <p
              className="mt-3 text-[11px] font-bold uppercase tracking-[0.22em]"
              style={{ color: NAVY, opacity: 0.75 }}
            >
              {org.tagline}
            </p>
          </div>

          <div className="my-6 h-px bg-black/8" />

          <p className="mb-4 text-center text-sm text-ink-500">
            Member &amp; Finance Portal — sign in to continue.
          </p>

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label htmlFor="login-email" className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-ink-600">
                Email
              </label>
              <input
                id="login-email"
                type="email"
                autoComplete="username"
                autoFocus
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError('') }}
                placeholder="you@ksochd.org"
                className="field"
                style={{ borderColor: '#e3dbcb' }}
              />
            </div>

            <div>
              <label htmlFor="login-password" className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-ink-600">
                Password
              </label>
              <div className="relative">
                <input
                  id="login-password"
                  type={show ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError('') }}
                  placeholder="••••••••"
                  className="field pr-11"
                  style={{ borderColor: '#e3dbcb' }}
                />
                <button
                  type="button"
                  onClick={() => setShow((v) => !v)}
                  aria-label={show ? 'Hide password' : 'Show password'}
                  className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-ink-400 transition hover:bg-black/5 hover:text-ink-700"
                >
                  {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <p className="rounded-xl bg-red-50 px-3 py-2 text-xs font-medium text-red-700">{error}</p>
            )}

            <button
              type="submit"
              disabled={busy}
              className="flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white transition disabled:opacity-60"
              style={{ background: NAVY }}
            >
              {busy ? 'Signing in…' : <><LogIn className="h-4 w-4" /> Sign in</>}
            </button>
          </form>

          <p
            className="mt-5 flex items-start gap-2 rounded-xl p-3 text-[11px] leading-relaxed"
            style={{ background: 'rgba(30,58,110,.06)', color: '#3c4a63' }}
          >
            <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>
              Accounts are checked in the browser, which keeps casual visitors out but not a
              determined attacker. Put the portal behind your backend or host-level auth before
              going live — see <strong>DEPLOY.md → Securing the admin</strong>.
            </span>
          </p>
        </div>

        <Link
          to="/"
          className="mt-5 flex items-center justify-center gap-1.5 text-sm font-semibold transition hover:underline"
          style={{ color: NAVY }}
        >
          <ArrowLeft className="h-4 w-4" /> Back to website
        </Link>
      </div>
    </div>
  )
}

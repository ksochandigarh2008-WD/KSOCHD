import { useState } from 'react'
import { ShieldAlert, KeyRound, LogOut } from 'lucide-react'
import { useSite } from '../../store/useSite'
import { SEEDED_PASSWORD } from '../../lib/production'

const NAVY = '#1e3a6e'
const CREAM = '#faf6ee'

/**
 * Shown instead of the panel when production mode is on and the signed-in account is
 * still using the password that ships in the README. There is no way past this screen
 * except changing the password — which is the point.
 */
export default function ForcedPasswordChange() {
  const changeOwnPassword = useSite((s) => s.changeOwnPassword)
  const logout = useSite((s) => s.logout)
  const email = useSite((s) => s.currentUser?.email)

  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')

  const submit = (e) => {
    e.preventDefault()
    setError('')
    if (next.length < 8) return setError('Use at least 8 characters.')
    if (next !== confirm) return setError('The new passwords do not match.')
    if (next === SEEDED_PASSWORD) return setError('That is the default password — choose a different one.')
    if (!changeOwnPassword(current, next)) return setError('The current password is not right.')
  }

  return (
    <div className="grid min-h-screen place-items-center px-4" style={{ background: CREAM }}>
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div
            className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl"
            style={{ background: NAVY }}
          >
            <ShieldAlert className="h-7 w-7 text-white" />
          </div>
          <h1 className="font-display text-2xl font-bold" style={{ color: NAVY }}>
            Change the default password
          </h1>
          <p className="mt-2 text-sm text-ink-600">
            Production mode is on, and <strong>{email}</strong> is still using the password that ships
            with the project. Anyone who has read the README knows it.
          </p>
        </div>

        <form
          onSubmit={submit}
          className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm"
          style={{ borderRadius: '0.75rem' }}
        >
          <label className="block">
            <span className="label">Current password</span>
            <input
              type="password"
              autoFocus
              className="field"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              placeholder="The password you signed in with"
            />
          </label>
          <label className="mt-4 block">
            <span className="label">New password</span>
            <input
              type="password"
              className="field"
              value={next}
              onChange={(e) => setNext(e.target.value)}
              placeholder="At least 8 characters"
            />
          </label>
          <label className="mt-4 block">
            <span className="label">Repeat new password</span>
            <input
              type="password"
              className="field"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </label>

          {error && (
            <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>
          )}

          <button
            type="submit"
            className="mt-5 w-full rounded-lg px-4 py-2.5 text-sm font-semibold text-white"
            style={{ background: NAVY }}
          >
            <KeyRound className="mr-1.5 inline h-4 w-4" /> Set new password
          </button>
        </form>

        <button
          onClick={logout}
          className="mx-auto mt-5 flex items-center gap-1.5 text-xs font-semibold text-ink-500 hover:text-ink-700"
        >
          <LogOut className="h-3.5 w-3.5" /> Sign out instead
        </button>
      </div>
    </div>
  )
}

import { useEffect, useRef } from 'react'

/**
 * Sign the admin out after a period of inactivity.
 *
 * The realistic risk is a shared office machine left at the admin panel. This is not
 * a security boundary — the data is client-side — it is about not leaving the door open.
 * `minutes <= 0` disables it.
 */
export function useIdleTimeout(minutes, onIdle) {
  const cb = useRef(onIdle)
  cb.current = onIdle

  useEffect(() => {
    const mins = Number(minutes)
    if (!mins || mins <= 0) return undefined

    let last = Date.now()
    const bump = () => { last = Date.now() }
    const events = ['mousemove', 'keydown', 'mousedown', 'scroll', 'touchstart', 'keypress']
    events.forEach((e) => window.addEventListener(e, bump, { passive: true }))

    // Check often enough that even a very short setting (used in tests) is honoured.
    const every = Math.max(250, Math.min(15000, (mins * 60000) / 2))
    const timer = setInterval(() => {
      if (Date.now() - last >= mins * 60000) {
        cleanup()
        cb.current()
      }
    }, every)

    function cleanup() {
      clearInterval(timer)
      events.forEach((e) => window.removeEventListener(e, bump))
    }
    return cleanup
  }, [minutes])
}

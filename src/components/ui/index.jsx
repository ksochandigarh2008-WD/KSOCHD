import { useEffect, useRef, useState, createContext, useContext, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { X, CheckCircle2, AlertTriangle, Info } from 'lucide-react'
import { cn } from '../../lib/utils'

/* -------------------------------- Toast -------------------------------- */
const ToastCtx = createContext(() => {})
export const useToast = () => useContext(ToastCtx)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const push = useCallback((message, tone = 'success') => {
    const id = Math.random().toString(36).slice(2)
    setToasts((t) => [...t, { id, message, tone }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3800)
  }, [])
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed bottom-4 left-1/2 z-[100] flex w-[min(92vw,26rem)] -translate-x-1/2 flex-col gap-2 sm:bottom-6">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              'pointer-events-auto flex items-start gap-2.5 rounded-xl px-4 py-3 text-sm font-medium shadow-lift animate-pop-in',
              t.tone === 'success' && 'bg-brand-700 text-white',
              t.tone === 'error' && 'bg-red-600 text-white',
              t.tone === 'info' && 'bg-ink-900 text-white',
            )}
          >
            {t.tone === 'success' && <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />}
            {t.tone === 'error' && <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />}
            {t.tone === 'info' && <Info className="mt-0.5 h-4 w-4 shrink-0" />}
            <span className="flex-1">{t.message}</span>
            <button onClick={() => setToasts((x) => x.filter((y) => y.id !== t.id))} aria-label="Dismiss">
              <X className="h-4 w-4 opacity-70 hover:opacity-100" />
            </button>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  )
}

/* -------------------------------- Reveal ------------------------------- */
export function Reveal({ children, delay = 0, className, as: Tag = 'div' }) {
  const ref = useRef(null)
  const [shown, setShown] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (typeof IntersectionObserver === 'undefined') return setShown(true)
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true)
          io.disconnect()
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return (
    <Tag
      ref={ref}
      className={cn('transition-all duration-700 ease-out', shown ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0', className)}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </Tag>
  )
}

/* -------------------------------- Counter ------------------------------ */
export function Counter({ to = 0, duration = 1400, suffix = '', prefix = '' }) {
  const [val, setVal] = useState(0)
  const ref = useRef(null)
  const started = useRef(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting || started.current) return
        started.current = true
        if (reduce) return setVal(to)
        const start = performance.now()
        const tick = (now) => {
          const p = Math.min(1, (now - start) / duration)
          const eased = 1 - Math.pow(1 - p, 3)
          setVal(Math.round(to * eased))
          if (p < 1) requestAnimationFrame(tick)
        }
        requestAnimationFrame(tick)
      },
      { threshold: 0.4 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [to, duration])
  return (
    <span ref={ref}>
      {prefix}
      {new Intl.NumberFormat('en-IN').format(val)}
      {suffix}
    </span>
  )
}

/* -------------------------------- Modal -------------------------------- */
export function Modal({ open, onClose, title, children, footer, size = 'md' }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose?.()
    if (open) {
      document.body.style.overflow = 'hidden'
      window.addEventListener('keydown', onKey)
    }
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])
  if (!open) return null
  const widths = { sm: 'max-w-md', md: 'max-w-xl', lg: 'max-w-3xl', xl: 'max-w-5xl' }
  return createPortal(
    <div className="fixed inset-0 z-[90] flex items-start justify-center overflow-y-auto bg-ink-900/50 p-4 backdrop-blur-sm sm:items-center">
      <div className="absolute inset-0" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        className={cn('relative my-8 w-full rounded-2xl bg-white shadow-lift animate-pop-in', widths[size])}
      >
        <div className="flex items-center justify-between border-b border-ink-900/5 px-5 py-4">
          <h3 className="font-display text-lg font-bold">{title}</h3>
          <button onClick={onClose} className="rounded-lg p-1.5 text-ink-500 hover:bg-ink-900/5" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-ink-900/5 px-5 py-3.5">{footer}</div>}
      </div>
    </div>,
    document.body,
  )
}

/* -------------------------------- Form bits ---------------------------- */
export function Field({ label, hint, children, className, required }) {
  return (
    <label className={cn('block', className)}>
      {label && (
        <span className="label">
          {label} {required && <span className="text-red-500">*</span>}
        </span>
      )}
      {children}
      {hint && <span className="mt-1 block text-xs text-ink-500">{hint}</span>}
    </label>
  )
}

export function Toggle({ checked, onChange, label, hint }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border border-ink-900/5 bg-white p-3.5">
      <div className="min-w-0">
        <p className="text-sm font-semibold">{label}</p>
        {hint && <p className="mt-0.5 text-xs text-ink-500">{hint}</p>}
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={cn(
          'relative h-6 w-11 shrink-0 rounded-full transition',
          checked ? 'bg-brand-600' : 'bg-ink-900/15',
        )}
        aria-pressed={checked}
        aria-label={label}
      >
        <span
          className={cn(
            'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all',
            checked ? 'left-[22px]' : 'left-0.5',
          )}
        />
      </button>
    </div>
  )
}

export function Badge({ children, tone = 'brand', className }) {
  const tones = {
    brand: 'bg-brand-50 text-brand-700',
    accent: 'bg-accent-500/15 text-accent-600',
    slate: 'bg-ink-900/5 text-ink-700',
    green: 'bg-emerald-50 text-emerald-700',
    red: 'bg-red-50 text-red-700',
  }
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold', tones[tone], className)}>
      {children}
    </span>
  )
}

export function SectionHeading({ eyebrow, title, sub, center = true, className }) {
  return (
    <div className={cn('max-w-2xl', center && 'mx-auto text-center', className)}>
      {eyebrow && <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-brand-600">{eyebrow}</p>}
      <h2 className="section-title text-balance">{title}</h2>
      {sub && <p className="mt-3 text-[15px] leading-relaxed text-ink-700">{sub}</p>}
    </div>
  )
}

export function EmptyState({ icon: Icon, title, text, action }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-ink-900/10 bg-ink-900/[0.015] px-6 py-12 text-center">
      {Icon && <Icon className="mb-3 h-8 w-8 text-ink-500/60" />}
      <p className="font-display text-lg font-semibold">{title}</p>
      {text && <p className="mt-1 max-w-sm text-sm text-ink-500">{text}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

/** Renders **bold** and _italic_ markdown-ish inline markup plus line breaks. */
export function RichText({ text, className }) {
  if (!text) return null
  const blocks = String(text).split('\n')
  return (
    <div className={cn('space-y-2', className)}>
      {blocks.map((line, i) => (
        <p key={i} className="leading-relaxed">
          {line.split(/(\*\*[^*]+\*\*|_[^_]+_)/g).map((part, j) => {
            if (part.startsWith('**') && part.endsWith('**'))
              return <strong key={j}>{part.slice(2, -2)}</strong>
            if (part.startsWith('_') && part.endsWith('_')) return <em key={j}>{part.slice(1, -1)}</em>
            return <span key={j}>{part}</span>
          })}
        </p>
      ))}
    </div>
  )
}

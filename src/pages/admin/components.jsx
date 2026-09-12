import { useRef } from 'react'
import { Trash2, Plus, ChevronUp, ChevronDown, GripVertical, Upload, Image as ImageIcon, Save } from 'lucide-react'
import { useToast } from '../../components/ui'
import { readFileAsDataURL } from '../../lib/utils'

export function Panel({ title, desc, children, actions, className }) {
  return (
    <section className={`rounded-2xl border border-ink-900/5 bg-white p-5 shadow-soft ${className || ''}`}>
      {(title || actions) && (
        <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            {title && <h2 className="font-display text-lg font-bold">{title}</h2>}
            {desc && <p className="mt-0.5 text-xs text-ink-500">{desc}</p>}
          </div>
          {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
        </header>
      )}
      {children}
    </section>
  )
}

export function TF({ label, value, onChange, hint, type = 'text', placeholder, className, required, error }) {
  return (
    <label className={`block ${className || ''}`}>
      <span className="label">
        {label} {required && <span className="text-red-500">*</span>}
      </span>
      <input
        type={type}
        aria-invalid={error ? 'true' : undefined}
        className={`field ${error ? 'border-red-400 focus:border-red-500 focus:ring-red-200' : ''}`}
        value={value ?? ''}
        placeholder={placeholder}
        onChange={(e) => onChange(type === 'number' ? Number(e.target.value) : e.target.value)}
      />
      {error ? (
        <span className="mt-1 block text-xs text-red-600">{error}</span>
      ) : hint ? (
        <span className="mt-1 block text-xs text-ink-500">{hint}</span>
      ) : null}
    </label>
  )
}

export function TA({ label, value, onChange, hint, rows = 4, placeholder, className }) {
  return (
    <label className={`block ${className || ''}`}>
      <span className="label">{label}</span>
      <textarea
        className="field"
        rows={rows}
        value={value ?? ''}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
      {hint && <span className="mt-1 block text-xs text-ink-500">{hint}</span>}
    </label>
  )
}

export function SEL({ label, value, onChange, options, hint, className }) {
  return (
    <label className={`block ${className || ''}`}>
      <span className="label">{label}</span>
      <select className="field" value={value ?? ''} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => (
          <option key={o.value ?? o} value={o.value ?? o}>
            {o.label ?? o}
          </option>
        ))}
      </select>
      {hint && <span className="mt-1 block text-xs text-ink-500">{hint}</span>}
    </label>
  )
}

/** Text field with an image upload that stores a data URL (or paste a URL). */
export function ImageField({ label, value, onChange, hint }) {
  const toast = useToast()
  const inputRef = useRef(null)

  const onFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 3_000_000) {
      toast('Image is over 3 MB — it may slow the site down. Try a smaller file.', 'error')
      return
    }
    const data = await readFileAsDataURL(file)
    onChange(data)
    toast('Image uploaded')
  }

  return (
    <div>
      <span className="label">{label}</span>
      <div className="flex gap-2">
        <input className="field flex-1" value={value ?? ''} onChange={(e) => onChange(e.target.value)} placeholder="https://… or upload" />
        <button type="button" onClick={() => inputRef.current?.click()} className="btn-ghost shrink-0 px-3" title="Upload">
          <Upload className="h-4 w-4" />
        </button>
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={onFile} />
      </div>
      {value ? (
        <img src={value} alt="" className="mt-2 h-20 w-32 rounded-lg border border-ink-900/10 object-cover" />
      ) : (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-ink-500">
          <ImageIcon className="h-3.5 w-3.5" /> No image selected
        </p>
      )}
      {hint && <span className="mt-1 block text-xs text-ink-500">{hint}</span>}
    </div>
  )
}

/** Generic CRUD list with inline editing of an item's fields. */
export function ListEditor({ title, desc, items, onAdd, onUpdate, onRemove, onMove, renderItem, newItemLabel = 'Add item', addLabel }) {
  return (
    <Panel
      title={title}
      desc={desc}
      actions={
        <button onClick={onAdd} className="btn-primary px-3.5 py-2 text-xs">
          <Plus className="h-3.5 w-3.5" /> {addLabel || newItemLabel}
        </button>
      }
    >
      {!items?.length ? (
        <p className="rounded-xl border border-dashed border-ink-900/10 px-4 py-8 text-center text-sm text-ink-500">
          Nothing here yet.
        </p>
      ) : (
        <div className="space-y-3">
          {items.map((item, i) => (
            <div key={item.id} className="rounded-xl border border-ink-900/10 bg-ink-900/[0.015] p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="flex items-center gap-2 text-xs font-semibold text-ink-500">
                  <GripVertical className="h-3.5 w-3.5" /> Item {i + 1}
                </span>
                <span className="flex gap-1">
                  <button onClick={() => onMove(i, -1)} disabled={i === 0} className="rounded-lg p-1.5 text-ink-500 hover:bg-white disabled:opacity-30" aria-label="Move up">
                    <ChevronUp className="h-4 w-4" />
                  </button>
                  <button onClick={() => onMove(i, 1)} disabled={i === items.length - 1} className="rounded-lg p-1.5 text-ink-500 hover:bg-white disabled:opacity-30" aria-label="Move down">
                    <ChevronDown className="h-4 w-4" />
                  </button>
                  <button onClick={() => onRemove(item.id)} className="rounded-lg p-1.5 text-red-600 hover:bg-red-50" aria-label="Delete">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </span>
              </div>
              {renderItem(item, (patch) => onUpdate(item.id, patch))}
            </div>
          ))}
        </div>
      )}
    </Panel>
  )
}


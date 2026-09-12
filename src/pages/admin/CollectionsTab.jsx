import { useState } from 'react'
import { GraduationCap, CalendarDays, Newspaper } from 'lucide-react'
import { useSite } from '../../store/useSite'
import { Panel, TF, TA, SEL, ImageField } from './components'
import { iconNames, getIcon } from '../../lib/iconMap'
import { uid, slugify, cn } from '../../lib/utils'
import { useToast } from '../../components/ui'

const subTabs = [
  { id: 'programs', label: 'Programmes', icon: GraduationCap },
  { id: 'events', label: 'Events', icon: CalendarDays },
  { id: 'stories', label: 'Stories', icon: Newspaper },
]

function ItemShell({ children, onRemove, onMove, index, total, title }) {
  return (
    <div className="rounded-xl border border-ink-900/10 bg-ink-900/[0.015] p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="truncate text-xs font-bold uppercase tracking-wide text-ink-500">{title}</p>
        <div className="flex shrink-0 gap-1">
          <button onClick={() => onMove(-1)} disabled={index === 0} className="rounded-lg p-1.5 text-ink-500 hover:bg-white disabled:opacity-30">↑</button>
          <button onClick={() => onMove(1)} disabled={index === total - 1} className="rounded-lg p-1.5 text-ink-500 hover:bg-white disabled:opacity-30">↓</button>
          <button onClick={onRemove} className="rounded-lg p-1.5 text-red-600 hover:bg-red-50">✕</button>
        </div>
      </div>
      {children}
    </div>
  )
}

export default function CollectionsTab() {
  const content = useSite((s) => s.content)
  const addListItem = useSite((s) => s.addListItem)
  const updateListItem = useSite((s) => s.updateListItem)
  const removeListItem = useSite((s) => s.removeListItem)
  const moveListItem = useSite((s) => s.moveListItem)
  const toast = useToast()
  const [tab, setTab] = useState('programs')

  const list = (key) => content[key] || []

  /* ------------------------------- programmes ------------------------------ */
  const Programs = () => (
    <Panel
      title="Programmes"
      desc="Each programme gets its own page, a donate link and AI knowledge."
      actions={<button onClick={() => { addListItem('programs', { slug: `program-${uid('').slice(1, 5)}`, title: 'New programme', summary: '', body: '', image: '', icon: 'Sparkles', costPerUnit: 1000, unitLabel: 'supports one person', metrics: [] }); toast('Programme added') }} className="btn-primary px-3.5 py-2 text-xs">+ Add programme</button>}
    >
      <div className="space-y-3">
        {list('programs').map((p, i) => (
          <ItemShell
            key={p.id}
            index={i}
            total={list('programs').length}
            title={p.title || 'Untitled programme'}
            onRemove={() => removeListItem('programs', p.id)}
            onMove={(d) => moveListItem('programs', i, d)}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <TF label="Title" value={p.title} onChange={(v) => updateListItem('programs', p.id, { title: v, slug: p.slug || slugify(v) })} />
              <TF label="URL slug" value={p.slug} onChange={(v) => updateListItem('programs', p.id, { slug: slugify(v) })} hint={`/programs/${p.slug}`} />
              <SEL label="Icon" value={p.icon} onChange={(v) => updateListItem('programs', p.id, { icon: v })} options={iconNames} />
              <div className="grid grid-cols-2 gap-3">
                <TF label="Cost per unit (₹)" type="number" value={p.costPerUnit} onChange={(v) => updateListItem('programs', p.id, { costPerUnit: v })} />
                <TF label="Unit label" value={p.unitLabel} onChange={(v) => updateListItem('programs', p.id, { unitLabel: v })} />
              </div>
              <TA label="Short summary" rows={2} value={p.summary} onChange={(v) => updateListItem('programs', p.id, { summary: v })} className="sm:col-span-2" />
              <TA label="Full description" rows={6} value={p.body} onChange={(v) => updateListItem('programs', p.id, { body: v })} className="sm:col-span-2" hint="Blank line between paragraphs." />
              <ImageField label="Cover image" value={p.image} onChange={(v) => updateListItem('programs', p.id, { image: v })} />
            </div>

            <div className="mt-4 border-t border-ink-900/5 pt-4">
              <p className="label">Key numbers</p>
              <div className="grid gap-3 sm:grid-cols-3">
                {(p.metrics || []).map((m, mi) => (
                  <div key={mi} className="flex gap-2">
                    <input className="field" value={m.value} onChange={(e) => { const next = [...p.metrics]; next[mi] = { ...m, value: e.target.value }; updateListItem('programs', p.id, { metrics: next }) }} placeholder="1,850" />
                    <input className="field" value={m.label} onChange={(e) => { const next = [...p.metrics]; next[mi] = { ...m, label: e.target.value }; updateListItem('programs', p.id, { metrics: next }) }} placeholder="Children" />
                    <button onClick={() => updateListItem('programs', p.id, { metrics: p.metrics.filter((_, x) => x !== mi) })} className="rounded-lg px-2 text-red-600 hover:bg-red-50">✕</button>
                  </div>
                ))}
              </div>
              <button
                onClick={() => updateListItem('programs', p.id, { metrics: [...(p.metrics || []), { label: 'New metric', value: '0' }] })}
                className="mt-2 text-xs font-semibold text-brand-700 hover:underline"
              >
                + Add a number
              </button>
            </div>
          </ItemShell>
        ))}
      </div>
    </Panel>
  )

  /* --------------------------------- events -------------------------------- */
  const Events = () => (
    <Panel
      title="Events"
      desc="Upcoming events appear on the homepage automatically."
      actions={<button onClick={() => { addListItem('events', { title: 'New event', date: new Date().toISOString().slice(0, 10), time: '10:00 am', location: '', category: 'Volunteer', image: '', excerpt: '', body: '', seats: 100, registrationOpen: true }); toast('Event added') }} className="btn-primary px-3.5 py-2 text-xs">+ Add event</button>}
    >
      <div className="space-y-3">
        {list('events').map((e, i) => (
          <ItemShell key={e.id} index={i} total={list('events').length} title={e.title} onRemove={() => removeListItem('events', e.id)} onMove={(d) => moveListItem('events', i, d)}>
            <div className="grid gap-4 sm:grid-cols-2">
              <TF label="Title" value={e.title} onChange={(v) => updateListItem('events', e.id, { title: v })} className="sm:col-span-2" />
              <TF label="Date" type="date" value={e.date} onChange={(v) => updateListItem('events', e.id, { date: v })} />
              <TF label="Time" value={e.time} onChange={(v) => updateListItem('events', e.id, { time: v })} />
              <TF label="Location" value={e.location} onChange={(v) => updateListItem('events', e.id, { location: v })} />
              <SEL label="Category" value={e.category} onChange={(v) => updateListItem('events', e.id, { category: v })} options={['Health', 'Education', 'Fundraiser', 'Volunteer', 'Relief', 'Community']} />
              <TF label="Seats / capacity" type="number" value={e.seats} onChange={(v) => updateListItem('events', e.id, { seats: v })} />
              <label className="flex items-center gap-2 self-end pb-2.5 text-sm font-medium">
                <input type="checkbox" checked={Boolean(e.registrationOpen)} onChange={(ev) => updateListItem('events', e.id, { registrationOpen: ev.target.checked })} className="h-4 w-4 rounded" />
                Registration open
              </label>
              <TA label="Short excerpt" rows={2} value={e.excerpt} onChange={(v) => updateListItem('events', e.id, { excerpt: v })} className="sm:col-span-2" />
              <TA label="Full description" rows={4} value={e.body} onChange={(v) => updateListItem('events', e.id, { body: v })} className="sm:col-span-2" />
              <ImageField label="Cover image" value={e.image} onChange={(v) => updateListItem('events', e.id, { image: v })} />
            </div>
          </ItemShell>
        ))}
      </div>
    </Panel>
  )

  /* -------------------------------- stories -------------------------------- */
  const Stories = () => (
    <Panel
      title="Stories"
      desc="Blog posts and field notes. Mark one or two as featured to show them on the homepage."
      actions={<button onClick={() => { addListItem('stories', { slug: `story-${uid('').slice(1, 5)}`, title: 'New story', date: new Date().toISOString().slice(0, 10), author: 'KSO Team', category: 'Impact', image: '', excerpt: '', body: '', featured: false }); toast('Story added') }} className="btn-primary px-3.5 py-2 text-xs">+ Add story</button>}
    >
      <div className="space-y-3">
        {list('stories').map((s, i) => (
          <ItemShell key={s.id} index={i} total={list('stories').length} title={s.title} onRemove={() => removeListItem('stories', s.id)} onMove={(d) => moveListItem('stories', i, d)}>
            <div className="grid gap-4 sm:grid-cols-2">
              <TF label="Title" value={s.title} onChange={(v) => updateListItem('stories', s.id, { title: v, slug: s.slug || slugify(v) })} className="sm:col-span-2" />
              <TF label="URL slug" value={s.slug} onChange={(v) => updateListItem('stories', s.id, { slug: slugify(v) })} />
              <TF label="Date" type="date" value={s.date} onChange={(v) => updateListItem('stories', s.id, { date: v })} />
              <TF label="Author" value={s.author} onChange={(v) => updateListItem('stories', s.id, { author: v })} />
              <SEL label="Category" value={s.category} onChange={(v) => updateListItem('stories', s.id, { category: v })} options={['Education', 'Health', 'Livelihood', 'Community', 'Impact', 'Volunteers']} />
              <label className="flex items-center gap-2 self-end pb-2.5 text-sm font-medium">
                <input type="checkbox" checked={Boolean(s.featured)} onChange={(ev) => updateListItem('stories', s.id, { featured: ev.target.checked })} className="h-4 w-4 rounded" />
                Feature on homepage
              </label>
              <TA label="Excerpt" rows={2} value={s.excerpt} onChange={(v) => updateListItem('stories', s.id, { excerpt: v })} className="sm:col-span-2" />
              <TA label="Full story" rows={8} value={s.body} onChange={(v) => updateListItem('stories', s.id, { body: v })} className="sm:col-span-2" hint="Blank line between paragraphs." />
              <ImageField label="Cover image" value={s.image} onChange={(v) => updateListItem('stories', s.id, { image: v })} />
            </div>
          </ItemShell>
        ))}
      </div>
    </Panel>
  )

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-bold">Programmes · Events · Stories</h1>
        <p className="text-sm text-ink-500">Everything you add here appears on the public site and in AI answers.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {subTabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              'flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition',
              tab === t.id ? 'bg-brand-700 text-white' : 'border border-ink-900/10 bg-white text-ink-700 hover:bg-ink-900/5',
            )}
          >
            <t.icon className="h-4 w-4" /> {t.label}
            <span className="rounded-full bg-white/20 px-1.5 text-[11px]">{list(t.id).length}</span>
          </button>
        ))}
      </div>

      {tab === 'programs' && <Programs />}
      {tab === 'events' && <Events />}
      {tab === 'stories' && <Stories />}
    </div>
  )
}

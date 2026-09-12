import { Info, Users, Quote, Images, Plus } from 'lucide-react'
import { useSite } from '../../store/useSite'
import { Panel, TF, TA, ImageField, SEL } from './components'
import { iconNames } from '../../lib/iconMap'
import { uid } from '../../lib/utils'
import { useToast } from '../../components/ui'

export default function AboutTab() {
  const content = useSite((s) => s.content)
  const set = useSite((s) => s.setContentPath)
  const addListItem = useSite((s) => s.addListItem)
  const updateListItem = useSite((s) => s.updateListItem)
  const removeListItem = useSite((s) => s.removeListItem)
  const toast = useToast()

  const about = content.about || {}

  const setBodyLine = (i, v) => {
    const next = [...(about.body || [])]
    next[i] = v
    set('about.body', next)
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-bold">About · People · Gallery</h1>
        <p className="text-sm text-ink-500">The About page, your team, testimonials and photo gallery.</p>
      </div>

      <Panel title={<span className="flex items-center gap-2"><Info className="h-4 w-4" /> About page</span>}>
        <div className="space-y-4">
          <TF label="Heading" value={about.heading} onChange={(v) => set('about.heading', v)} />
          <div>
            <span className="label">Body paragraphs</span>
            <div className="space-y-2">
              {(about.body || []).map((p, i) => (
                <div key={i} className="flex gap-2">
                  <textarea className="field min-h-[76px]" value={p} onChange={(e) => setBodyLine(i, e.target.value)} />
                  <button
                    onClick={() => set('about.body', about.body.filter((_, x) => x !== i))}
                    className="self-start rounded-lg p-2 text-red-600 hover:bg-red-50"
                    aria-label="Remove paragraph"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
            <button onClick={() => set('about.body', [...(about.body || []), 'New paragraph'])} className="mt-2 text-xs font-semibold text-brand-700 hover:underline">
              + Add paragraph
            </button>
          </div>
          <ImageField label="Side image" value={about.image} onChange={(v) => set('about.image', v)} />
        </div>
      </Panel>

      <Panel
        title="Values / how we work"
        desc="Four cards on the About page"
        actions={<button onClick={() => { addListItem('about.values', { title: 'New value', text: '', icon: 'Sparkles' }); toast('Value added') }} className="btn-primary px-3.5 py-2 text-xs"><Plus className="h-3.5 w-3.5" /> Add</button>}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          {(about.values || []).map((v) => (
            <div key={v.id} className="rounded-xl border border-ink-900/10 p-3.5">
              <div className="mb-2 flex justify-between">
                <SEL label="Icon" value={v.icon} onChange={(x) => updateListItem('about.values', v.id, { icon: x })} options={iconNames} />
                <button onClick={() => removeListItem('about.values', v.id)} className="self-end rounded-lg p-1.5 text-red-600 hover:bg-red-50">✕</button>
              </div>
              <TF label="Title" value={v.title} onChange={(x) => updateListItem('about.values', v.id, { title: x })} />
              <TA label="Text" rows={2} value={v.text} onChange={(x) => updateListItem('about.values', v.id, { text: x })} className="mt-3" />
            </div>
          ))}
        </div>
      </Panel>

      <Panel
        title="Milestones"
        desc="Timeline on the About page"
        actions={<button onClick={() => { addListItem('about.milestones', { year: String(new Date().getFullYear()), text: 'New milestone' }); toast('Milestone added') }} className="btn-primary px-3.5 py-2 text-xs"><Plus className="h-3.5 w-3.5" /> Add</button>}
      >
        <div className="space-y-3">
          {(about.milestones || []).map((m) => (
            <div key={m.id} className="flex gap-2">
              <input className="field max-w-[110px]" value={m.year} onChange={(e) => updateListItem('about.milestones', m.id, { year: e.target.value })} placeholder="2026" />
              <input className="field" value={m.text} onChange={(e) => updateListItem('about.milestones', m.id, { text: e.target.value })} placeholder="What happened" />
              <button onClick={() => removeListItem('about.milestones', m.id)} className="rounded-lg px-2 text-red-600 hover:bg-red-50">✕</button>
            </div>
          ))}
        </div>
      </Panel>

      <Panel
        title={<span className="flex items-center gap-2"><Users className="h-4 w-4" /> Team</span>}
        desc="Office bearers and programme leads"
        actions={<button onClick={() => { addListItem('team', { name: 'New member', role: 'Role', bio: '', image: '' }); toast('Member added') }} className="btn-primary px-3.5 py-2 text-xs"><Plus className="h-3.5 w-3.5" /> Add</button>}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          {(content.team || []).map((m) => (
            <div key={m.id} className="rounded-xl border border-ink-900/10 p-3.5">
              <div className="mb-2 flex justify-end">
                <button onClick={() => removeListItem('team', m.id)} className="rounded-lg p-1.5 text-red-600 hover:bg-red-50">✕</button>
              </div>
              <div className="grid gap-3">
                <TF label="Name" value={m.name} onChange={(v) => updateListItem('team', m.id, { name: v })} />
                <TF label="Role" value={m.role} onChange={(v) => updateListItem('team', m.id, { role: v })} />
                <TA label="Short bio" rows={2} value={m.bio} onChange={(v) => updateListItem('team', m.id, { bio: v })} />
                <ImageField label="Photo" value={m.image} onChange={(v) => updateListItem('team', m.id, { image: v })} hint="Square photo works best" />
              </div>
            </div>
          ))}
        </div>
      </Panel>

      <Panel
        title={<span className="flex items-center gap-2"><Quote className="h-4 w-4" /> Testimonials</span>}
        desc="Shown on the homepage"
        actions={<button onClick={() => { addListItem('testimonials', { quote: 'New quote', author: 'Name', role: 'Role' }); toast('Testimonial added') }} className="btn-primary px-3.5 py-2 text-xs"><Plus className="h-3.5 w-3.5" /> Add</button>}
      >
        <div className="space-y-3">
          {(content.testimonials || []).map((t) => (
            <div key={t.id} className="rounded-xl border border-ink-900/10 p-3.5">
              <div className="mb-2 flex justify-end">
                <button onClick={() => removeListItem('testimonials', t.id)} className="rounded-lg p-1.5 text-red-600 hover:bg-red-50">✕</button>
              </div>
              <TA label="Quote" rows={2} value={t.quote} onChange={(v) => updateListItem('testimonials', t.id, { quote: v })} />
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <TF label="Author" value={t.author} onChange={(v) => updateListItem('testimonials', t.id, { author: v })} />
                <TF label="Role / context" value={t.role} onChange={(v) => updateListItem('testimonials', t.id, { role: v })} />
              </div>
            </div>
          ))}
        </div>
      </Panel>

      <Panel
        title={<span className="flex items-center gap-2"><Images className="h-4 w-4" /> Gallery</span>}
        desc="Masonry grid on the Gallery page. Tags become filter buttons."
        actions={<button onClick={() => { addListItem('gallery.images', { src: '', caption: 'New photo', tag: 'General' }); toast('Photo slot added') }} className="btn-primary px-3.5 py-2 text-xs"><Plus className="h-3.5 w-3.5" /> Add photo</button>}
      >
        <TF label="Gallery heading" value={content.gallery?.heading} onChange={(v) => set('gallery.heading', v)} className="mb-4" />
        <div className="grid gap-3 sm:grid-cols-2">
          {(content.gallery?.images || []).map((img) => (
            <div key={img.id} className="rounded-xl border border-ink-900/10 p-3.5">
              <div className="mb-2 flex justify-end">
                <button onClick={() => removeListItem('gallery.images', img.id)} className="rounded-lg p-1.5 text-red-600 hover:bg-red-50">✕</button>
              </div>
              <div className="grid gap-3">
                <ImageField label="Image" value={img.src} onChange={(v) => updateListItem('gallery.images', img.id, { src: v })} />
                <TF label="Caption" value={img.caption} onChange={(v) => updateListItem('gallery.images', img.id, { caption: v })} />
                <TF label="Tag" value={img.tag} onChange={(v) => updateListItem('gallery.images', img.id, { tag: v })} />
              </div>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  )
}

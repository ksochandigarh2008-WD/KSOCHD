import { Plus, PieChart, FileText } from 'lucide-react'
import { useSite } from '../../store/useSite'
import { Panel, TF, TA } from './components'
import { uid, formatCurrency } from '../../lib/utils'
import { useToast } from '../../components/ui'

const palette = ['var(--brand-600)', 'var(--brand-400)', 'var(--accent-400)', 'rgb(148 163 184)', 'rgb(96 165 250)', 'rgb(244 114 182)']

export default function ImpactTab() {
  const content = useSite((s) => s.content)
  const set = useSite((s) => s.setContentPath)
  const addListItem = useSite((s) => s.addListItem)
  const updateListItem = useSite((s) => s.updateListItem)
  const removeListItem = useSite((s) => s.removeListItem)
  const toast = useToast()
  const impact = content.impact || {}

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-bold">Impact & reports</h1>
        <p className="text-sm text-ink-500">Headline stats, fund allocation, yearly figures and downloadable reports.</p>
      </div>

      <Panel title="Headline statistics" desc="Shown in the hero and at the top of the Impact page">
        <div className="grid gap-3 sm:grid-cols-2">
          {(content.stats || []).map((s) => (
            <div key={s.id} className="flex gap-2">
              <input
                className="field max-w-[110px]"
                type="number"
                value={s.value}
                onChange={(e) => updateListItem('stats', s.id, { value: Number(e.target.value) })}
                placeholder="12480"
              />
              <input className="field max-w-[70px]" value={s.suffix} onChange={(e) => updateListItem('stats', s.id, { suffix: e.target.value })} placeholder="+" />
              <input className="field" value={s.label} onChange={(e) => updateListItem('stats', s.id, { label: e.target.value })} placeholder="Lives reached" />
              <select className="field max-w-[150px]" value={s.icon} onChange={(e) => updateListItem('stats', s.id, { icon: e.target.value })}>
                {['Users', 'GraduationCap', 'Stethoscope', 'HeartHandshake', 'Sprout', 'Home', 'Utensils', 'BookOpen', 'Briefcase', 'HandHeart'].map((i) => (
                  <option key={i}>{i}</option>
                ))}
              </select>
              <button onClick={() => removeListItem('stats', s.id)} className="rounded-lg px-2 text-red-600 hover:bg-red-50">✕</button>
            </div>
          ))}
        </div>
        <button onClick={() => { addListItem('stats', { label: 'New statistic', value: 0, suffix: '+', icon: 'Sparkles' }); toast('Statistic added') }} className="mt-3 text-xs font-semibold text-brand-700 hover:underline">
          + Add statistic
        </button>
      </Panel>

      <Panel
        title={<span className="flex items-center gap-2"><PieChart className="h-4 w-4" /> Fund allocation</span>}
        desc="Percentages on the Impact page. They should add up to 100."
        actions={<button onClick={() => { addListItem('impact.allocation', { label: 'New category', value: 0, color: palette[(impact.allocation?.length || 0) % palette.length] }); toast('Category added') }} className="btn-primary px-3.5 py-2 text-xs"><Plus className="h-3.5 w-3.5" /> Add</button>}
      >
        <div className="space-y-3">
          {(impact.allocation || []).map((a) => (
            <div key={a.id} className="flex flex-wrap items-center gap-2">
              <input className="field flex-1" value={a.label} onChange={(e) => updateListItem('impact.allocation', a.id, { label: e.target.value })} placeholder="Programmes & beneficiaries" />
              <input className="field max-w-[90px]" type="number" value={a.value} onChange={(e) => updateListItem('impact.allocation', a.id, { value: Number(e.target.value) })} />
              <span className="text-sm text-ink-500">%</span>
              <input type="color" className="h-10 w-12 rounded-lg border border-ink-900/10" value={a.color?.startsWith('var') ? '#0d9488' : a.color} onChange={(e) => updateListItem('impact.allocation', a.id, { color: e.target.value })} />
              <button onClick={() => removeListItem('impact.allocation', a.id)} className="rounded-lg px-2 text-red-600 hover:bg-red-50">✕</button>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-ink-500">
          Total: {(impact.allocation || []).reduce((a, x) => a + Number(x.value || 0), 0)}%
        </p>
      </Panel>

      <Panel
        title="Yearly figures"
        desc="Bar chart on the Impact page"
        actions={<button onClick={() => { addListItem('impact.yearly', { year: String(new Date().getFullYear()), raised: 0, people: 0 }); toast('Year added') }} className="btn-primary px-3.5 py-2 text-xs"><Plus className="h-3.5 w-3.5" /> Add year</button>}
      >
        <div className="space-y-3">
          {(impact.yearly || []).map((y) => (
            <div key={y.id} className="flex flex-wrap gap-2">
              <input className="field max-w-[110px]" value={y.year} onChange={(e) => updateListItem('impact.yearly', y.id, { year: e.target.value })} />
              <input className="field flex-1" type="number" value={y.raised} onChange={(e) => updateListItem('impact.yearly', y.id, { raised: Number(e.target.value) })} placeholder="Funds raised (₹)" />
              <input className="field flex-1" type="number" value={y.people} onChange={(e) => updateListItem('impact.yearly', y.id, { people: Number(e.target.value) })} placeholder="People reached" />
              <button onClick={() => removeListItem('impact.yearly', y.id)} className="rounded-lg px-2 text-red-600 hover:bg-red-50">✕</button>
            </div>
          ))}
        </div>
      </Panel>

      <Panel
        title={<span className="flex items-center gap-2"><FileText className="h-4 w-4" /> Downloadable reports</span>}
        desc="Upload PDFs to your host (or Google Drive) and paste the links."
        actions={<button onClick={() => { addListItem('impact.reports', { title: 'Annual Report', type: 'PDF', size: '1.0 MB', href: '#' }); toast('Report added') }} className="btn-primary px-3.5 py-2 text-xs"><Plus className="h-3.5 w-3.5" /> Add</button>}
      >
        <div className="space-y-3">
          {(impact.reports || []).map((r) => (
            <div key={r.id} className="rounded-xl border border-ink-900/10 p-3.5">
              <div className="mb-2 flex justify-end">
                <button onClick={() => removeListItem('impact.reports', r.id)} className="rounded-lg p-1.5 text-red-600 hover:bg-red-50">✕</button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <TF label="Title" value={r.title} onChange={(v) => updateListItem('impact.reports', r.id, { title: v })} />
                <TF label="Link (URL)" value={r.href} onChange={(v) => updateListItem('impact.reports', r.id, { href: v })} />
                <TF label="Type" value={r.type} onChange={(v) => updateListItem('impact.reports', r.id, { type: v })} />
                <TF label="File size" value={r.size} onChange={(v) => updateListItem('impact.reports', r.id, { size: v })} />
              </div>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="Impact page copy">
        <TF label="Heading" value={impact.heading} onChange={(v) => set('impact.heading', v)} />
        <TA label="Note under the heading" rows={2} value={impact.note} onChange={(v) => set('impact.note', v)} className="mt-4"
          hint="Use this to be clear about which year the figures cover." />
      </Panel>
    </div>
  )
}

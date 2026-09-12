import { useMemo, useState } from 'react'
import { Building2, Home as HomeIcon, Heart, Search, Plus, X } from 'lucide-react'
import { useSite } from '../../store/useSite'
import { Panel, TF, TA, SEL } from './components'
import { useToast } from '../../components/ui'
import { uid } from '../../lib/utils'
import { orgSchema, fieldErrors } from './schemas'

export default function SiteContentTab() {
  const content = useSite((s) => s.content)
  const set = useSite((s) => s.setContentPath)
  const toast = useToast()
  const [presetDraft, setPresetDraft] = useState('')

  const setSocial = (k, v) => set(`org.social.${k}`, v)

  /** Organisation validation is reported inline, never enforced: a half-filled profile
   *  must not stop the admin saving anything else. */
  const orgErrors = useMemo(() => fieldErrors(orgSchema, content.org || {}), [content.org])

  const addPreset = () => {
    const n = Number(presetDraft)
    if (!n || n < 100) return toast('Enter an amount of at least ₹100', 'error')
    set('donationPresets', [...(content.donationPresets || []), n].sort((a, b) => a - b))
    setPresetDraft('')
  }
  const removePreset = (n) => set('donationPresets', (content.donationPresets || []).filter((x) => x !== n))

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-bold">Site content</h1>
        <p className="text-sm text-ink-500">Names, contact details, homepage copy and donation settings.</p>
      </div>

      <Panel title={<span className="flex items-center gap-2"><Building2 className="h-4 w-4" /> Organisation</span>} desc="Appears in the header, footer, contact page and AI answers">
        <div className="grid gap-4 sm:grid-cols-2">
          <TF label="Short name" value={content.org.shortName} onChange={(v) => set('org.shortName', v)} hint="Used in the logo mark and tab titles" error={orgErrors.shortName} />
          <TF label="Full legal name" value={content.org.fullName} onChange={(v) => set('org.fullName', v)} error={orgErrors.fullName} />
          <TF label="Tagline" value={content.org.tagline} onChange={(v) => set('org.tagline', v)} />
          <TF label="Founded" value={content.org.foundedYear} onChange={(v) => set('org.foundedYear', v)} error={orgErrors.foundedYear} />
          <TF label="City" value={content.org.city} onChange={(v) => set('org.city', v)} />
          <TF label="Areas served" value={content.org.area} onChange={(v) => set('org.area', v)} />
          <TF label="Address" value={content.org.address} onChange={(v) => set('org.address', v)} className="sm:col-span-2" />
          <TF label="Phone" value={content.org.phone} onChange={(v) => set('org.phone', v)} error={orgErrors.phone} />
          <TF label="Email" value={content.org.email} onChange={(v) => set('org.email', v)} error={orgErrors.email} />
          <TF label="Office hours" value={content.org.hours} onChange={(v) => set('org.hours', v)} className="sm:col-span-2" />
          <TF label="Registration number" value={content.org.registration} onChange={(v) => set('org.registration', v)} className="sm:col-span-2" />
          <TF label="80G / tax exemption" value={content.org.taxExemption} onChange={(v) => set('org.taxExemption', v)} className="sm:col-span-2" />
          <TF label="FCRA (if registered)" value={content.org.fcra} onChange={(v) => set('org.fcra', v)} className="sm:col-span-2" />
        </div>

        <div className="mt-5 border-t border-ink-900/5 pt-5">
          <p className="label">Social links</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {['facebook', 'instagram', 'twitter', 'youtube', 'linkedin'].map((k) => (
              <TF key={k} label={k} value={content.org.social?.[k]} onChange={(v) => setSocial(k, v)} placeholder="https://" />
            ))}
          </div>
          <p className="mt-2 text-xs text-ink-500">Leave a link blank and its icon is hidden automatically.</p>
        </div>

        <div className="mt-5 grid gap-4 border-t border-ink-900/5 pt-5 sm:grid-cols-2">
          <TF label="UPI ID" value={content.org.upiId} onChange={(v) => set('org.upiId', v)} hint="Shown on the donate page and by the AI assistant" error={orgErrors.upiId} />
          <TF label="Bank name" value={content.org.bankName} onChange={(v) => set('org.bankName', v)} error={orgErrors.bankName} />
          <TF label="Account number" value={content.org.bankAccount} onChange={(v) => set('org.bankAccount', v)} error={orgErrors.bankAccount} />
          <TF label="IFSC" value={content.org.bankIfsc} onChange={(v) => set('org.bankIfsc', v)} error={orgErrors.bankIfsc} />
        </div>
      </Panel>

      <Panel title={<span className="flex items-center gap-2"><HomeIcon className="h-4 w-4" /> Homepage hero</span>} desc="The first thing visitors read">
        <div className="grid gap-4">
          <TF label="Eyebrow" value={content.hero.eyebrow} onChange={(v) => set('hero.eyebrow', v)} />
          <TF label="Headline" value={content.hero.title} onChange={(v) => set('hero.title', v)} />
          <TA label="Sub-headline" rows={3} value={content.hero.subtitle} onChange={(v) => set('hero.subtitle', v)} />
          <div className="grid gap-4 sm:grid-cols-2">
            <TF label="Primary button label" value={content.hero.primaryCta.label} onChange={(v) => set('hero.primaryCta.label', v)} />
            <SEL label="Primary button links to" value={content.hero.primaryCta.href} onChange={(v) => set('hero.primaryCta.href', v)} options={['/donate', '/volunteer', '/programs', '/contact', '/events']} />
            <TF label="Secondary button label" value={content.hero.secondaryCta.label} onChange={(v) => set('hero.secondaryCta.label', v)} />
            <SEL label="Secondary button links to" value={content.hero.secondaryCta.href} onChange={(v) => set('hero.secondaryCta.href', v)} options={['/volunteer', '/donate', '/about', '/programs', '/events']} />
          </div>
          <TF label="Hero image URL" value={content.hero.image} onChange={(v) => set('hero.image', v)} hint="Paste any image URL, or upload in the media fields elsewhere." />
          {content.hero.image && <img src={content.hero.image} alt="" className="h-40 w-full rounded-xl object-cover" />}
        </div>
      </Panel>

      <Panel title={<span className="flex items-center gap-2"><Heart className="h-4 w-4" /> Donation settings</span>} desc="Preset amounts and donate-page copy">
        <TF label="Heading" value={content.donationCopy.heading} onChange={(v) => set('donationCopy.heading', v)} />
        <TA label="Sub-heading" rows={2} value={content.donationCopy.sub} onChange={(v) => set('donationCopy.sub', v)} className="mt-4" />

        <div className="mt-5 border-t border-ink-900/5 pt-5">
          <p className="label">Preset amounts (₹)</p>
          <div className="flex flex-wrap gap-2">
            {(content.donationPresets || []).map((n) => (
              <span key={n} className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1.5 text-sm font-semibold text-brand-700">
                ₹{n.toLocaleString('en-IN')}
                <button onClick={() => removePreset(n)} className="text-brand-700/60 hover:text-red-600" aria-label="Remove">
                  <X className="h-3.5 w-3.5" />
                </button>
              </span>
            ))}
          </div>
          <div className="mt-3 flex gap-2">
            <input
              className="field max-w-[160px]"
              inputMode="numeric"
              value={presetDraft}
              onChange={(e) => setPresetDraft(e.target.value.replace(/[^\d]/g, ''))}
              placeholder="e.g. 7500"
            />
            <button onClick={addPreset} className="btn-ghost px-3.5 py-2 text-xs"><Plus className="h-3.5 w-3.5" /> Add</button>
          </div>
        </div>
      </Panel>

      <Panel title={<span className="flex items-center gap-2"><Search className="h-4 w-4" /> SEO</span>} desc="Browser tab title and search description">
        <TF label="Meta description" value={content.seo.metaDescription} onChange={(v) => set('seo.metaDescription', v)} hint="Around 150 characters. This is what Google shows under your link." />
        <TA label="Extra notes for the AI assistant" rows={3} value={content.ai?.extraKnowledge} onChange={(v) => set('ai.extraKnowledge', v)} className="mt-4"
          hint="Anything the assistant should know that is not elsewhere on the site — office rules, holiday closures, specific schemes." />
      </Panel>
    </div>
  )
}

import { useState } from 'react'
import { Mail, Phone, MapPin, Clock, CheckCircle2, MessageSquare } from 'lucide-react'
import { useContent, useSite } from '../store/useSite'
import { Reveal, Field, useToast } from '../components/ui'
import { validateEmail, validatePhone } from '../lib/utils'
import PageHero from '../components/PageHero'

const topics = ['General enquiry', 'Volunteering', 'Corporate / CSR partnership', 'Donation support', 'Media', 'Report an issue']

export default function Contact() {
  const c = useContent()
  const addSubmission = useSite((s) => s.addSubmission)
  const toast = useToast()
  const [form, setForm] = useState({ name: '', email: '', phone: '', topic: topics[0], message: '' })
  const [errors, setErrors] = useState({})
  const [sent, setSent] = useState(false)

  const submit = (e) => {
    e.preventDefault()
    const err = {}
    if (!form.name.trim()) err.name = 'Please enter your name'
    if (!validateEmail(form.email)) err.email = 'Enter a valid email'
    if (form.phone && !validatePhone(form.phone)) err.phone = 'Enter a valid 10-digit mobile number'
    if (form.message.trim().length < 10) err.message = 'Please write at least a sentence or two'
    setErrors(err)
    if (Object.keys(err).length) return
    addSubmission({ kind: 'contact', name: form.name, email: form.email, phone: form.phone, message: `[${form.topic}] ${form.message}` })
    setSent(true)
    toast('Message sent. We usually reply within two working days.')
  }

  return (
    <>
      <PageHero eyebrow="Contact" title="Talk to a person, not a form" text="We read everything that comes in and reply within two working days." crumb="Contact" />

      <section className="container-page py-14">
        <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
          <Reveal>
            <div className="rounded-3xl border border-ink-900/5 bg-white p-6 shadow-soft sm:p-8">
              {sent ? (
                <div className="py-10 text-center">
                  <CheckCircle2 className="mx-auto h-14 w-14 text-brand-600" />
                  <h2 className="mt-4 font-display text-2xl font-bold">Message sent</h2>
                  <p className="mt-2 text-ink-700">Thanks {form.name} — we will reply to {form.email} shortly.</p>
                  <button onClick={() => { setSent(false); setForm({ ...form, message: '' }) }} className="btn-ghost mt-6">Send another</button>
                </div>
              ) : (
                <form onSubmit={submit} className="space-y-4">
                  <h2 className="font-display text-xl font-bold">Send us a message</h2>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Your name" required>
                      <input className="field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                      {errors.name && <span className="mt-1 block text-xs text-red-600">{errors.name}</span>}
                    </Field>
                    <Field label="Email" required>
                      <input className="field" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                      {errors.email && <span className="mt-1 block text-xs text-red-600">{errors.email}</span>}
                    </Field>
                    <Field label="Mobile">
                      <input className="field" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                      {errors.phone && <span className="mt-1 block text-xs text-red-600">{errors.phone}</span>}
                    </Field>
                    <Field label="Topic">
                      <select className="field" value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })}>
                        {topics.map((t) => <option key={t}>{t}</option>)}
                      </select>
                    </Field>
                  </div>
                  <Field label="Message" required>
                    <textarea className="field min-h-[130px]" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="How can we help?" />
                    {errors.message && <span className="mt-1 block text-xs text-red-600">{errors.message}</span>}
                  </Field>
                  <button className="btn-primary w-full">Send message</button>
                </form>
              )}
            </div>
          </Reveal>

          <Reveal delay={80}>
            <div className="space-y-5">
              <div className="rounded-2xl border border-ink-900/5 bg-white p-6 shadow-soft">
                <h2 className="font-display text-lg font-bold">Reach us directly</h2>
                <ul className="mt-4 space-y-4 text-sm">
                  {[
                    { icon: MapPin, label: 'Office', value: c.org.address },
                    { icon: Phone, label: 'Phone', value: c.org.phone, href: `tel:${c.org.phone}` },
                    { icon: Mail, label: 'Email', value: c.org.email, href: `mailto:${c.org.email}` },
                    { icon: Clock, label: 'Hours', value: c.org.hours },
                  ].map(({ icon: Icon, label, value, href }) => (
                    <li key={label} className="flex gap-3">
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700">
                        <Icon className="h-4 w-4" />
                      </span>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">{label}</p>
                        {href ? (
                          <a href={href} className="font-medium text-ink-900 hover:text-brand-700">{value}</a>
                        ) : (
                          <p className="font-medium text-ink-900">{value}</p>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="overflow-hidden rounded-2xl border border-ink-900/5 bg-white shadow-soft">
                <div className="grid h-56 place-items-center bg-ink-900/[0.03] text-center">
                  <div>
                    <MapPin className="mx-auto mb-2 h-7 w-7 text-brand-600" />
                    <p className="text-sm font-semibold">{c.org.address}</p>
                    <p className="mt-1 text-xs text-ink-500">
                      Paste a Google Maps embed URL in Admin → Content → Organisation to show a live map here.
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl bg-brand-900 p-6 text-white">
                <MessageSquare className="mb-3 h-6 w-6 text-accent-400" />
                <p className="font-display text-lg font-bold">Prefer to ask right now?</p>
                <p className="mt-1.5 text-sm text-white/75">
                  Open the AI assistant in the bottom-right corner — it answers donation, volunteering and event
                  questions instantly from our published information.
                </p>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  )
}

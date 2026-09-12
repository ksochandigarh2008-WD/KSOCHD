import { useState } from 'react'
import { CalendarDays, MapPin, Clock, Users, CalendarPlus } from 'lucide-react'
import { useContent, useSite } from '../store/useSite'
import { Reveal, Modal, Field, EmptyState, Badge, useToast } from '../components/ui'
import { formatDate, isUpcoming, validateEmail, validatePhone } from '../lib/utils'
import PageHero from '../components/PageHero'

export default function Events() {
  const c = useContent()
  const addSubmission = useSite((s) => s.addSubmission)
  const toast = useToast()
  const [tab, setTab] = useState('upcoming')
  const [active, setActive] = useState(null)
  const [form, setForm] = useState({ name: '', email: '', phone: '', guests: '1' })
  const [errors, setErrors] = useState({})

  const all = (c.events || []).slice().sort((a, b) => new Date(a.date) - new Date(b.date))
  const list = all.filter((e) => (tab === 'upcoming' ? isUpcoming(e.date) : !isUpcoming(e.date)))

  const submit = (e) => {
    e.preventDefault()
    const next = {}
    if (!form.name.trim()) next.name = 'Please enter your name'
    if (!validateEmail(form.email)) next.email = 'Enter a valid email'
    if (form.phone && !validatePhone(form.phone)) next.phone = 'Enter a valid 10-digit mobile number'
    setErrors(next)
    if (Object.keys(next).length) return
    addSubmission({
      kind: 'event',
      name: form.name,
      email: form.email,
      phone: form.phone,
      message: `Registering ${form.guests} for: ${active.title} (${formatDate(active.date)})`,
      event: active.title,
    })
    toast(`Registered for ${active.title}. See you there!`)
    setActive(null)
    setForm({ name: '', email: '', phone: '', guests: '1' })
  }

  return (
    <>
      <PageHero
        eyebrow="Events"
        title="Camps, marathons, packing evenings and open houses"
        text="Everything we do in public. Turn up once — most of our long-term volunteers started exactly like that."
        crumb="Events"
      />

      <section className="container-page py-14">
        <div className="mb-8 inline-flex rounded-full border border-ink-900/10 bg-white p-1 shadow-soft">
          {[
            ['upcoming', 'Upcoming'],
            ['past', 'Past'],
          ].map(([k, label]) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={`rounded-full px-5 py-2 text-sm font-semibold transition ${
                tab === k ? 'bg-brand-700 text-white' : 'text-ink-700 hover:bg-ink-900/5'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {list.length === 0 ? (
          <EmptyState
            icon={CalendarDays}
            title={tab === 'upcoming' ? 'No upcoming events scheduled' : 'No past events recorded'}
            text="Add events in the admin panel and they will appear here automatically."
          />
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {list.map((e, i) => (
              <Reveal key={e.id} delay={i * 70}>
                <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-ink-900/5 bg-white shadow-soft transition hover:-translate-y-1 hover:shadow-lift">
                  <div className="relative h-48 overflow-hidden">
                    <img src={e.image} alt={e.title} className="h-full w-full object-cover" loading="lazy" />
                    <span className="absolute left-3 top-3 rounded-full bg-white/95 px-3 py-1 text-xs font-bold text-brand-700 shadow">
                      {formatDate(e.date, { day: 'numeric', month: 'short' })}
                    </span>
                    {!isUpcoming(e.date) && <span className="absolute right-3 top-3"><Badge tone="slate">Completed</Badge></span>}
                  </div>
                  <div className="flex flex-1 flex-col p-5">
                    <div className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-brand-600">
                      {e.category}
                    </div>
                    <h3 className="font-display text-lg font-bold leading-snug">{e.title}</h3>
                    <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-700">{e.excerpt}</p>
                    <ul className="mt-4 space-y-1.5 text-xs text-ink-500">
                      <li className="flex items-center gap-2"><Clock className="h-3.5 w-3.5" /> {e.time}</li>
                      <li className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5" /> {e.location}</li>
                      {e.seats ? <li className="flex items-center gap-2"><Users className="h-3.5 w-3.5" /> {e.seats} seats</li> : null}
                    </ul>
                    <button
                      onClick={() => setActive(e)}
                      disabled={!e.registrationOpen || !isUpcoming(e.date)}
                      className="btn-primary mt-5 w-full"
                    >
                      <CalendarPlus className="h-4 w-4" />
                      {!isUpcoming(e.date) ? 'Event completed' : e.registrationOpen ? 'Register' : 'Registration closed'}
                    </button>
                  </div>
                </article>
              </Reveal>
            ))}
          </div>
        )}
      </section>

      <Modal open={Boolean(active)} onClose={() => setActive(null)} title={active ? `Register — ${active.title}` : ''}>
        {active && (
          <form onSubmit={submit} className="space-y-4">
            <p className="rounded-xl bg-brand-50/70 p-3 text-sm text-ink-700">
              {formatDate(active.date, { weekday: 'long', day: 'numeric', month: 'long' })} · {active.time} · {active.location}
            </p>
            <Field label="Full name" required error={errors.name}>
              <input className="field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Your name" />
              {errors.name && <span className="mt-1 block text-xs text-red-600">{errors.name}</span>}
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Email" required>
                <input className="field" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" />
                {errors.email && <span className="mt-1 block text-xs text-red-600">{errors.email}</span>}
              </Field>
              <Field label="Mobile">
                <input className="field" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="10-digit number" />
                {errors.phone && <span className="mt-1 block text-xs text-red-600">{errors.phone}</span>}
              </Field>
            </div>
            <Field label="Number of people">
              <select className="field" value={form.guests} onChange={(e) => setForm({ ...form, guests: e.target.value })}>
                {['1', '2', '3', '4', '5+'].map((n) => <option key={n}>{n}</option>)}
              </select>
            </Field>
            <button className="btn-primary w-full">Confirm registration</button>
            <p className="text-center text-xs text-ink-500">This demo saves the registration to the admin inbox.</p>
          </form>
        )}
      </Modal>
    </>
  )
}

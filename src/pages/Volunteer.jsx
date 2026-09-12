import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Clock, MapPin, GraduationCap, HeartHandshake, CheckCircle2, Users } from 'lucide-react'
import { useContent, useSite } from '../store/useSite'
import { Reveal, Field, Badge, useToast } from '../components/ui'
import { cn, validateEmail, validatePhone } from '../lib/utils'
import PageHero from '../components/PageHero'

const roles = [
  'Teaching / mentoring',
  'Health camp support',
  'Event & logistics',
  'Content, design, translation',
  'Fundraising & outreach',
  'Field surveys',
]

const availability = ['Weekday evenings', 'Saturday', 'Sunday', 'Weekday mornings', 'Remote / flexible']

export default function Volunteer() {
  const c = useContent()
  const addSubmission = useSite((s) => s.addSubmission)
  const addMembership = useSite((s) => s.addRow)
  const toast = useToast()
  const [form, setForm] = useState({ name: '', email: '', phone: '', city: '', roles: [], avail: [], about: '' })
  const [errors, setErrors] = useState({})
  const [sent, setSent] = useState(false)

  const toggle = (key, value) =>
    setForm((f) => ({ ...f, [key]: f[key].includes(value) ? f[key].filter((v) => v !== value) : [...f[key], value] }))

  const submit = (e) => {
    e.preventDefault()
    const err = {}
    if (!form.name.trim()) err.name = 'Please enter your name'
    if (!validateEmail(form.email)) err.email = 'Enter a valid email'
    if (!validatePhone(form.phone)) err.phone = 'Enter a valid 10-digit mobile number'
    if (!form.roles.length) err.roles = 'Pick at least one area you would like to help with'
    setErrors(err)
    if (Object.keys(err).length) return
    addSubmission({ kind: 'volunteer', name: form.name, email: form.email, phone: form.phone, message: `Roles: ${form.roles.join(', ')} | Availability: ${form.avail.join(', ')} | City: ${form.city} | ${form.about}` })
    // Create a pending membership record so the application lands in the
    // Membership system, not just the inbox.
    //
    // No memberNo here on purpose: the store assigns the next number in sequence
    // (this used to mint a random KSO-####, which collided with the roster and
    // left gaps in a series the office reads out over the phone).
    addMembership('memberships', {
      name: form.name,
      email: form.email,
      phone: form.phone,
      type: 'Volunteer',
      tier: 'Individual',
      status: 'Pending',
      joined: new Date().toISOString().slice(0, 10),
      renewsOn: '',
      centre: form.city || 'Unassigned',
      city: form.city || '',
      skills: form.roles.join(', '),
      feeAmount: 0,
      feeCycle: 'none',
      address: '',
      notes: form.about ? `Applied online. ${form.about}` : 'Applied via the volunteer form.',
      avatar: '',
      eventsAttended: 0,
    })
    setSent(true)
    toast('Application received — a coordinator will call you within a week. 🙏')
  }

  return (
    <>
      <PageHero
        eyebrow="Volunteer"
        title="Two hours a fortnight is all it takes to start"
        text="640 people currently volunteer with KSO. Most of them started with one Saturday."
        crumb="Volunteer"
      />

      <section className="container-page py-14">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.1fr]">
          {/* left — what to expect */}
          <Reveal>
            <div>
              <h2 className="font-display text-2xl font-bold">What volunteering actually looks like</h2>
              <p className="mt-3 text-[15px] leading-relaxed text-ink-700">
                No experience and no long-term commitment is needed to begin. Here is the honest version of the process.
              </p>

              <ol className="mt-7 space-y-5">
                {[
                  { icon: Users, title: 'Apply in two minutes', text: 'Fill the form. A coordinator calls you within a week — usually in the evening.' },
                  { icon: MapPin, title: 'Get matched to a centre near you', text: 'We place people within about 3 km of where they live, so showing up stays easy.' },
                  { icon: GraduationCap, title: 'One short orientation', text: 'A 90-minute session on safeguarding, consent and how our centres run.' },
                  { icon: Clock, title: 'Start with one shift a fortnight', text: 'Most volunteers quietly increase it to weekly within a couple of months.' },
                ].map((s) => (
                  <li key={s.title} className="flex gap-4">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700">
                      <s.icon className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="font-semibold">{s.title}</p>
                      <p className="mt-0.5 text-sm leading-relaxed text-ink-700">{s.text}</p>
                    </div>
                  </li>
                ))}
              </ol>

              <div className="mt-8 rounded-2xl border border-ink-900/5 bg-white p-5 shadow-soft">
                <p className="font-display text-base font-bold">Currently most needed</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {['Maths tutors (Class 6–10)', 'Spoken English mentors', 'Pharmacists for camps', 'Photographers', 'Grant writers'].map((n) => (
                    <Badge key={n} tone="accent">{n}</Badge>
                  ))}
                </div>
                <p className="mt-3 text-xs text-ink-500">Across {c.org.area}</p>
              </div>

              <div className="mt-5 rounded-2xl bg-brand-50/70 p-5">
                <p className="flex items-center gap-2 font-semibold text-brand-800">
                  <HeartHandshake className="h-4 w-4" /> Not ready to commit?
                </p>
                <p className="mt-1.5 text-sm text-ink-700">
                  Come to one event first. <Link to="/events" className="font-semibold text-brand-700 underline">See what is coming up</Link>.
                </p>
              </div>
            </div>
          </Reveal>

          {/* right — form */}
          <Reveal delay={80}>
            <div className="rounded-3xl border border-ink-900/5 bg-white p-6 shadow-soft sm:p-8">
              {sent ? (
                <div className="py-8 text-center">
                  <CheckCircle2 className="mx-auto h-14 w-14 text-brand-600" />
                  <h2 className="mt-4 font-display text-2xl font-bold">Application received</h2>
                  <p className="mt-2 text-ink-700">
                    Thank you, {form.name}. A coordinator will contact you on {form.phone} within a week.
                  </p>
                  <div className="mt-6 flex flex-wrap justify-center gap-3">
                    <Link to="/events" className="btn-primary">Browse events</Link>
                    <button onClick={() => setSent(false)} className="btn-ghost">Submit another</button>
                  </div>
                </div>
              ) : (
                <form onSubmit={submit} className="space-y-5">
                  <h2 className="font-display text-xl font-bold">Apply as a volunteer</h2>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Full name" required>
                      <input className="field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Your name" />
                      {errors.name && <span className="mt-1 block text-xs text-red-600">{errors.name}</span>}
                    </Field>
                    <Field label="City / sector">
                      <input className="field" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="e.g. Sector 38, Chandigarh" />
                    </Field>
                    <Field label="Email" required>
                      <input className="field" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" />
                      {errors.email && <span className="mt-1 block text-xs text-red-600">{errors.email}</span>}
                    </Field>
                    <Field label="Mobile" required>
                      <input className="field" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="10-digit number" />
                      {errors.phone && <span className="mt-1 block text-xs text-red-600">{errors.phone}</span>}
                    </Field>
                  </div>

                  <div>
                    <span className="label">What would you like to help with?</span>
                    <div className="flex flex-wrap gap-2">
                      {roles.map((r) => (
                        <button
                          type="button"
                          key={r}
                          onClick={() => toggle('roles', r)}
                          className={cn(
                            'rounded-full border px-3.5 py-2 text-sm font-medium transition',
                            form.roles.includes(r) ? 'border-brand-600 bg-brand-600 text-white' : 'border-ink-900/10 bg-white text-ink-700 hover:border-brand-300',
                          )}
                        >
                          {r}
                        </button>
                      ))}
                    </div>
                    {errors.roles && <span className="mt-1.5 block text-xs text-red-600">{errors.roles}</span>}
                  </div>

                  <div>
                    <span className="label">When are you usually free?</span>
                    <div className="flex flex-wrap gap-2">
                      {availability.map((a) => (
                        <button
                          type="button"
                          key={a}
                          onClick={() => toggle('avail', a)}
                          className={cn(
                            'rounded-full border px-3.5 py-2 text-sm font-medium transition',
                            form.avail.includes(a) ? 'border-brand-600 bg-brand-50 text-brand-800' : 'border-ink-900/10 bg-white text-ink-700 hover:border-brand-300',
                          )}
                        >
                          {a}
                        </button>
                      ))}
                    </div>
                  </div>

                  <Field label="Anything else? (optional)">
                    <textarea className="field min-h-[92px]" value={form.about} onChange={(e) => setForm({ ...form, about: e.target.value })} placeholder="Skills, languages, why you want to volunteer…" />
                  </Field>

                  <button className="btn-primary w-full">Submit application</button>
                  <p className="text-center text-xs text-ink-500">
                    We never share your details. This demo stores applications in the admin inbox.
                  </p>
                </form>
              )}
            </div>
          </Reveal>
        </div>
      </section>
    </>
  )
}

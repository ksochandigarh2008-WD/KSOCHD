import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  Heart, Repeat, Check, CreditCard, Smartphone, Building2, ShieldCheck, Receipt, ArrowRight, Sparkles,
} from 'lucide-react'
import { useContent, useSite } from '../store/useSite'
import db from '../lib/db'
import { Reveal, Field, Badge, useToast, Modal } from '../components/ui'
import { describeAmount } from '../ai/engine'
import { formatCurrency, cn, validateEmail, validatePhone } from '../lib/utils'
import PageHero from '../components/PageHero'

const steps = ['Amount', 'Frequency', 'Your details', 'Payment']

export default function Donate() {
  const c = useContent()
  const addSubmission = useSite((s) => s.addSubmission)
  const toast = useToast()

  const [step, setStep] = useState(0)
  const [amount, setAmount] = useState(c.donationPresets?.[1] || 1000)
  const [custom, setCustom] = useState('')
  const [frequency, setFrequency] = useState('monthly')
  const [program, setProgram] = useState(c.programs?.[0]?.slug || '')
  const [method, setMethod] = useState('upi')
  const [done, setDone] = useState(null)
  const [form, setForm] = useState({ name: '', email: '', phone: '', pan: '', anonymous: false })
  const [errors, setErrors] = useState({})

  const finalAmount = custom ? Number(custom.replace(/[^\d]/g, '')) || 0 : amount
  const impact = useMemo(() => describeAmount(finalAmount, c), [finalAmount, c])
  const monthlyNote = frequency === 'monthly' ? ' per month' : ' one-time'

  const next = () => {
    if (step === 0 && finalAmount < 100) return setErrors({ amount: 'Minimum donation is ₹100' })
    if (step === 2) {
      const e = {}
      if (!form.name.trim()) e.name = 'Please enter your name'
      if (!validateEmail(form.email)) e.email = 'Enter a valid email'
      if (form.phone && !validatePhone(form.phone)) e.phone = 'Enter a valid 10-digit mobile number'
      if (form.pan && !/[A-Z]{5}[0-9]{4}[A-Z]/i.test(form.pan)) e.pan = 'PAN format looks wrong (e.g. ABCDE1234F)'
      setErrors(e)
      if (Object.keys(e).length) return
    }
    setErrors({})
    setStep((s) => Math.min(3, s + 1))
  }

  const finish = async () => {
    const donorName = form.anonymous ? 'Anonymous' : form.name
    const record = {
      date: new Date().toISOString().slice(0, 10),
      type: 'income',
      category: 'Donation',
      amount: Number(finalAmount),
      program,
      party: donorName,
      method: method.toUpperCase(),
      reference: `WEB-${Date.now().toString(36).toUpperCase()}`,
      status: method === 'upi' || method === 'bank' ? 'Pending' : 'Cleared',
      note: `${frequency === 'monthly' ? 'Monthly' : 'One-time'} donation — ${form.anonymous ? 'anonymous' : form.email}`,
      memberId: '',
      frequency,
    }
    setDone({ ...record, donor: donorName })
    toast('Thank you. Your support has been recorded. 🙏')
    // Persist through the data layer so it lands in Postgres / your API / local
    // store depending on how the site is configured (see src/lib/db.js).
    try {
      await db.transactions.create(record)
    } catch (e) {
      console.error('Donation could not be saved:', e)
      toast('We could not save your donation details — please contact us.', 'error')
    }
    addSubmission({ kind: 'donation', name: donorName, email: form.email, phone: form.phone, message: JSON.stringify(record) })
  }

  if (done) {
    return (
      <section className="container-page py-20">
        <div className="mx-auto max-w-lg text-center">
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-brand-100 text-brand-700">
            <Check className="h-8 w-8" />
          </span>
          <h1 className="mt-6 font-display text-3xl font-bold">Thank you, {done.donor}.</h1>
          <p className="mt-3 text-ink-700">
            Your {done.frequency === 'monthly' ? 'monthly' : 'one-time'} donation of{' '}
            <strong>{formatCurrency(done.amount)}</strong> to{' '}
            <strong>{(c.programs || []).find((p) => p.slug === done.program)?.title || 'our general fund'}</strong> has
            been recorded.
          </p>
          <div className="mt-6 rounded-2xl border border-ink-900/5 bg-white p-5 text-left text-sm shadow-soft">
            <p className="flex items-center gap-2 font-semibold"><Receipt className="h-4 w-4 text-brand-700" /> Receipt</p>
            <p className="mt-1.5 text-ink-700">
              A receipt will be emailed to {done.note?.includes('@') ? form.email : 'you'} within 48 hours.
              {/80g/i.test(c.org.taxExemption || '') && ' It is 80G valid for tax deduction.'}
            </p>
            <p className="mt-3 flex items-start gap-2 text-xs text-ink-500">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
              This demo build records the donation in the local admin ledger. Connect a payment gateway (Razorpay /
              Stripe / UPI) to collect real payments — see DEPLOY.md.
            </p>
          </div>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link to="/" className="btn-primary">Back to home</Link>
            <Link to="/impact" className="btn-ghost">See your impact</Link>
          </div>
        </div>
      </section>
    )
  }

  return (
    <>
      <PageHero
        eyebrow="Donate"
        title={c.donationCopy?.heading || 'Give once, or give monthly'}
        text={c.donationCopy?.sub}
        crumb="Donate"
      />

      <section className="container-page py-14">
        <div className="grid gap-8 lg:grid-cols-[1.25fr_0.75fr]">
          {/* ---------------- form ---------------- */}
          <Reveal>
            <div className="rounded-3xl border border-ink-900/5 bg-white p-6 shadow-soft sm:p-8">
              {/* stepper */}
              <ol className="mb-8 flex items-center gap-2">
                {steps.map((s, i) => (
                  <li key={s} className="flex flex-1 items-center gap-2">
                    <button
                      onClick={() => i < step && setStep(i)}
                      className={cn(
                        'grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold transition',
                        i < step && 'bg-brand-100 text-brand-700 hover:bg-brand-200',
                        i === step && 'bg-brand-700 text-white',
                        i > step && 'bg-ink-900/10 text-ink-500',
                      )}
                    >
                      {i < step ? <Check className="h-3.5 w-3.5" /> : i + 1}
                    </button>
                    <span className={cn('hidden text-xs font-semibold sm:block', i === step ? 'text-ink-900' : 'text-ink-500')}>{s}</span>
                    {i < steps.length - 1 && <span className={cn('h-px flex-1', i < step ? 'bg-brand-300' : 'bg-ink-900/10')} />}
                  </li>
                ))}
              </ol>

              {/* step 1 — amount */}
              {step === 0 && (
                <div className="animate-fade-in">
                  <h2 className="font-display text-xl font-bold">Choose an amount</h2>
                  <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {(c.donationPresets || []).map((a) => (
                      <button
                        key={a}
                        onClick={() => { setAmount(a); setCustom('') }}
                        className={cn(
                          'rounded-2xl border-2 p-4 text-left transition',
                          !custom && amount === a ? 'border-brand-600 bg-brand-50' : 'border-ink-900/10 hover:border-brand-300',
                        )}
                      >
                        <span className="block font-display text-xl font-bold">{formatCurrency(a)}</span>
                        <span className="text-[11px] leading-tight text-ink-500">
                          {frequency === 'monthly' ? 'per month' : 'one-time'}
                        </span>
                      </button>
                    ))}
                    <button
                      onClick={() => { setCustom(''); setAmount(0) }}
                      className={cn(
                        'rounded-2xl border-2 p-4 text-left transition',
                        custom ? 'border-brand-600 bg-brand-50' : 'border-ink-900/10 hover:border-brand-300',
                      )}
                    >
                      <span className="block font-display text-xl font-bold">Other</span>
                      <span className="text-[11px] text-ink-500">Enter an amount</span>
                    </button>
                  </div>
                  {custom !== '' || amount === 0 ? (
                    <Field label="Custom amount (INR)" className="mt-4">
                      <input
                        className="field"
                        inputMode="numeric"
                        value={custom}
                        onChange={(e) => setCustom(e.target.value.replace(/[^\d]/g, ''))}
                        placeholder="e.g. 7500"
                      />
                    </Field>
                  ) : null}
                  {errors.amount && <p className="mt-2 text-xs text-red-600">{errors.amount}</p>}

                  <div className="mt-5 rounded-xl bg-brand-50/70 p-4">
                    <p className="flex items-center gap-2 text-sm font-semibold text-brand-800">
                      <Sparkles className="h-4 w-4" /> What this does
                    </p>
                    <p className="mt-1 text-sm text-ink-700">{impact}</p>
                  </div>

                  <Field label="Direct this to" className="mt-5">
                    <select className="field" value={program} onChange={(e) => setProgram(e.target.value)}>
                      <option value="">Where it is needed most (general fund)</option>
                      {(c.programs || []).map((p) => <option key={p.id} value={p.slug}>{p.title}</option>)}
                    </select>
                  </Field>
                </div>
              )}

              {/* step 2 — frequency */}
              {step === 1 && (
                <div className="animate-fade-in">
                  <h2 className="font-display text-xl font-bold">How often?</h2>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {[
                      { k: 'monthly', icon: Repeat, title: 'Monthly', text: 'Predictable income lets us plan teachers, medicines and kits a year ahead. Cancel any time.' },
                      { k: 'once', icon: Heart, title: 'One-time', text: 'Every rupee helps, and there is no follow-up commitment.' },
                    ].map(({ k, icon: Icon, title, text }) => (
                      <button
                        key={k}
                        onClick={() => setFrequency(k)}
                        className={cn(
                          'rounded-2xl border-2 p-5 text-left transition',
                          frequency === k ? 'border-brand-600 bg-brand-50' : 'border-ink-900/10 hover:border-brand-300',
                        )}
                      >
                        <Icon className={cn('mb-2 h-6 w-6', frequency === k ? 'text-brand-700' : 'text-ink-500')} />
                        <span className="block font-display text-lg font-bold">{title}</span>
                        <span className="mt-1 block text-sm text-ink-700">{text}</span>
                      </button>
                    ))}
                  </div>
                  <p className="mt-5 rounded-xl bg-ink-900/[0.03] p-4 text-sm text-ink-700">
                    You are giving <strong>{formatCurrency(finalAmount)}</strong>
                    {monthlyNote} to{' '}
                    <strong>{(c.programs || []).find((p) => p.slug === program)?.title || 'our general fund'}</strong>.
                  </p>
                </div>
              )}

              {/* step 3 — details */}
              {step === 2 && (
                <div className="animate-fade-in space-y-4">
                  <h2 className="font-display text-xl font-bold">Your details</h2>
                  <Field label="Full name" required>
                    <input className="field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="As it should appear on the receipt" />
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
                  <Field label="PAN (for 80G receipt)" hint="Optional, but needed for tax deduction above ₹2,000.">
                    <input className="field uppercase" value={form.pan} onChange={(e) => setForm({ ...form, pan: e.target.value.toUpperCase() })} placeholder="ABCDE1234F" />
                    {errors.pan && <span className="mt-1 block text-xs text-red-600">{errors.pan}</span>}
                  </Field>
                  <label className="flex items-center gap-2.5 rounded-xl border border-ink-900/10 p-3.5 text-sm">
                    <input type="checkbox" checked={form.anonymous} onChange={(e) => setForm({ ...form, anonymous: e.target.checked })} className="h-4 w-4 rounded border-ink-900/20 text-brand-700" />
                    Keep my donation anonymous (we will still record it internally)
                  </label>
                </div>
              )}

              {/* step 4 — payment */}
              {step === 3 && (
                <div className="animate-fade-in">
                  <h2 className="font-display text-xl font-bold">Payment</h2>
                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    {[
                      { k: 'upi', icon: Smartphone, label: 'UPI' },
                      { k: 'card', icon: CreditCard, label: 'Card' },
                      { k: 'bank', icon: Building2, label: 'Bank transfer' },
                    ].map(({ k, icon: Icon, label }) => (
                      <button
                        key={k}
                        onClick={() => setMethod(k)}
                        className={cn(
                          'flex items-center justify-center gap-2 rounded-2xl border-2 p-4 text-sm font-semibold transition',
                          method === k ? 'border-brand-600 bg-brand-50 text-brand-800' : 'border-ink-900/10 hover:border-brand-300',
                        )}
                      >
                        <Icon className="h-5 w-5" /> {label}
                      </button>
                    ))}
                  </div>

                  <div className="mt-5 rounded-2xl bg-ink-900/[0.03] p-5">
                    {method === 'upi' && (
                      <>
                        <p className="text-sm font-semibold">Pay to UPI ID</p>
                        <p className="mt-1 font-mono text-lg font-bold text-brand-800">{c.org.upiId}</p>
                        <p className="mt-2 text-xs text-ink-500">Open any UPI app, pay the ID above, and add your email in the remark.</p>
                      </>
                    )}
                    {method === 'card' && (
                      <p className="text-sm text-ink-700">
                        Card payments are handled by the payment gateway you connect. In this demo build the donation
                        is recorded locally — see <strong>DEPLOY.md</strong> for the Razorpay/Stripe integration steps.
                      </p>
                    )}
                    {method === 'bank' && (
                      <dl className="grid gap-2 text-sm sm:grid-cols-2">
                        <div><dt className="text-xs uppercase tracking-wide text-ink-500">Bank</dt><dd className="font-semibold">{c.org.bankName}</dd></div>
                        <div><dt className="text-xs uppercase tracking-wide text-ink-500">Account no.</dt><dd className="font-semibold">{c.org.bankAccount}</dd></div>
                        <div><dt className="text-xs uppercase tracking-wide text-ink-500">IFSC</dt><dd className="font-semibold">{c.org.bankIfsc}</dd></div>
                        <div><dt className="text-xs uppercase tracking-wide text-ink-500">Account name</dt><dd className="font-semibold">{c.org.fullName}</dd></div>
                      </dl>
                    )}
                  </div>

                  <div className="mt-5 flex items-center justify-between rounded-2xl bg-brand-900 p-5 text-white">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-white/60">Giving</p>
                      <p className="font-display text-2xl font-bold">{formatCurrency(finalAmount)}</p>
                      <p className="text-xs text-white/70">{frequency === 'monthly' ? 'Every month' : 'One-time'}</p>
                    </div>
                    <button onClick={finish} className="btn-accent">
                      <Heart className="h-4 w-4" /> Confirm donation
                    </button>
                  </div>
                </div>
              )}

              {/* nav */}
              <div className="mt-7 flex justify-between">
                <button onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0} className="btn-ghost">
                  Back
                </button>
                {step < 3 && (
                  <button onClick={next} className="btn-primary">
                    Continue <ArrowRight className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          </Reveal>

          {/* ---------------- aside ---------------- */}
          <Reveal delay={80}>
            <aside className="space-y-5 lg:sticky lg:top-24">
              <div className="rounded-2xl border border-ink-900/5 bg-white p-6 shadow-soft">
                <h3 className="font-display text-lg font-bold">Why monthly?</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-700">
                  A monthly donor is worth far more than the sum of their donations: it lets us sign a tutor’s
                  contract, book a camp venue, or order medicines in advance instead of reacting.
                </p>
                <div className="mt-4 space-y-2 text-sm">
                  {[
                    ['₹500/mo', 'A child’s learning kit every term'],
                    ['₹1,000/mo', 'Medicines for ~3 patients a month'],
                    ['₹2,500/mo', 'Half a micro-grant for a Rozgar graduate'],
                    ['₹5,000/mo', 'A full learning centre’s monthly supplies'],
                  ].map(([a, b]) => (
                    <div key={a} className="flex items-start justify-between gap-3 border-b border-ink-900/5 pb-2 last:border-0">
                      <span className="font-semibold text-brand-700">{a}</span>
                      <span className="text-right text-ink-700">{b}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-ink-900/5 bg-white p-6 shadow-soft">
                <h3 className="font-display text-base font-bold">You are covered by</h3>
                <ul className="mt-3 space-y-2.5 text-sm text-ink-700">
                  {[
                    ['80G tax deduction', /80g/i.test(c.org.taxExemption || '')],
                    ['Receipt within 48 hours', true],
                    ['Annual audited financials', true],
                    ['Utilisation report on request', true],
                  ].map(([label, ok]) => (
                    <li key={label} className="flex items-center gap-2">
                      <ShieldCheck className={cn('h-4 w-4', ok ? 'text-brand-600' : 'text-ink-500/40')} />
                      {label}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-2xl bg-accent-500/10 p-6">
                <h3 className="font-display text-base font-bold">Giving as a company?</h3>
                <p className="mt-2 text-sm text-ink-700">
                  We are CSR-1 registered and can supply project proposals, budgets and utilisation certificates.
                </p>
                <Link to="/contact" className="btn-ghost mt-4 w-full">Talk to us</Link>
              </div>
            </aside>
          </Reveal>
        </div>
      </section>
    </>
  )
}

/**
 * AI CONTENT STUDIO
 * Drafts real copy from your own site content.
 *  • Offline: deterministic templates filled with your programmes, numbers and contact details.
 *  • Online : the same brief is sent to your configured LLM for a richer draft.
 */

export const STUDIO_TEMPLATES = [
  { id: 'story', label: 'Field story / blog post', hint: 'A draft article about one programme, ready to edit and publish.' },
  { id: 'appeal', label: 'Donation appeal email', hint: 'A fundraising email to your supporter list.' },
  { id: 'social', label: 'Social media captions', hint: 'Instagram, LinkedIn and X versions of one announcement.' },
  { id: 'volunteer', label: 'Volunteer recruitment post', hint: 'Asking for help with a specific role or event.' },
  { id: 'thanks', label: 'Donor thank-you note', hint: 'Short, warm, and specific about impact.' },
  { id: 'event', label: 'Event description', hint: 'Blurb for a camp, drive or fundraiser.' },
  { id: 'report', label: 'Annual impact summary', hint: 'A plain-language wrap-up of the year.' },
  { id: 'csr', label: 'Corporate CSR pitch', hint: 'A short proposal to a company partner.' },
]

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)]

const money = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`

export function generateOffline(kind, content, opts = {}) {
  const org = content.org || {}
  const programs = content.programs || []
  const program = programs.find((p) => p.slug === opts.program) || programs[0] || {}
  const stats = content.stats || []
  const events = (content.events || [])[0] || {}
  const contact = `\n\n— ${org.fullName}\n${org.phone} · ${org.email}`

  switch (kind) {
    case 'story': {
      const title = `${program.title || 'Our work'}: what a week actually looks like`
      return [
        `## ${title}`,
        ``,
        `_Draft — replace the placeholders with a real name, a real moment and a real photograph._`,
        ``,
        `Every week at ${org.shortName}, the ${program.title || 'programme'} team does the same unglamorous things that add up to something. Here is what that looked like recently in ${org.area}.`,
        ``,
        `**The problem.** ${program.summary || 'Describe the gap this programme closes.'} In our experience the issue is rarely a lack of willingness — it is the absence of something small and specific standing in the way.`,
        ``,
        `**What we did.** ${String(program.body || '').split('\n\n')[0] || 'Describe the intervention.'}`,
        ``,
        `**What it cost.** ${money(program.costPerUnit)} ${program.unitLabel || 'per beneficiary'}. That is the whole figure, including the coordinator time, and it is published in our annual report.`,
        ``,
        `**Where we are still short.** [Name the gap honestly — volunteers, a venue, a specific supply.] This is the part most organisations leave out, and it is usually the part that moves people to help.`,
        ``,
        `**How to help.** Come and see a session, or fund one. ${money(program.costPerUnit)} ${program.unitLabel || ''}.`,
        contact,
      ].join('\n')
    }

    case 'appeal': {
      const amount = opts.amount || 1000
      const units = program.costPerUnit ? Math.max(1, Math.floor(amount / program.costPerUnit)) : 1
      return [
        `**Subject:** ${money(amount)} puts ${units === 1 ? 'one person' : `${units} people`} through ${program.title || 'our programme'} this month`,
        ``,
        `Dear [first name],`,
        ``,
        `I am writing with one specific ask: would you give ${money(amount)} to ${org.shortName} this month?`,
        ``,
        `${program.summary || 'Our work focuses on education, health, livelihoods and relief in the Tricity.'}`,
        ``,
        `Here is exactly what that does: ${money(amount)} is ${units} × ${program.unitLabel || 'a unit of impact'}.`,
        ``,
        `We publish where every rupee goes and our books are audited annually. ${(content.impact?.allocation || []).map((a) => `${a.value}% to ${a.label.toLowerCase()}`).join(', ')}.`,
        ``,
        `If now is not the right time, please ignore this — you will not get a second email about it.`,
        ``,
        `With thanks,`,
        `[Your name]`,
        `[Your role], ${org.fullName}`,
        ``,
        `P.S. ${stats[0] ? `${stats[0].value}${stats[0].suffix} ${stats[0].label.toLowerCase()} so far — ${org.area}.` : 'Every rupee stays in the Tricity.'}`,
      ].join('\n')
    }

    case 'social': {
      const hook = program.title || 'our work'
      return [
        `**Instagram**`,
        ``,
        `${hook} — the short version.`,
        ``,
        `${program.summary || ''}`,
        ``,
        `${money(program.costPerUnit)} ${program.unitLabel || ''}. That is the whole cost.`,
        ``,
        `Link in bio to donate. Questions in the comments — a real person answers.`,
        ``,
        `#chandigarh #ngoindia #${String(program.slug || 'community')} #giveback #tricity`,
        ``,
        `—`,
        ``,
        `**LinkedIn**`,
        ``,
        `${stats[0] ? `${stats[0].value}${stats[0].suffix} ${stats[0].label.toLowerCase()}` : 'Thousands of neighbours supported'} across ${org.area}.`,
        ``,
        `${program.summary || ''} ${String(program.body || '').split('\n\n')[0] || ''}`,
        ``,
        `We are ${org.shortName}, a volunteer-led non-profit in Chandigarh. If your company is looking for a CSR partner with clean reporting and a genuinely local footprint, write to ${org.email}.`,
        ``,
        `—`,
        ``,
        `**X / Twitter**`,
        ``,
        `${hook}: ${program.summary || ''}`,
        ``,
        `${money(program.costPerUnit)} ${program.unitLabel || ''}. Receipts in 48h, audited books, local work. ${org.email}`,
        ``,
        `#Chandigarh #NGO`,
      ].join('\n')
    }

    case 'volunteer': {
      return [
        `**We need ${opts.role || 'volunteers'} — ${org.area}**`,
        ``,
        `Two hours a fortnight. That is genuinely all it takes to start.`,
        ``,
        `${program.summary || 'Our programmes run on volunteers from the neighbourhoods they serve.'}`,
        ``,
        `What you would do:`,
        `• ${pick(['Sit with two or three children and work through what they did not understand that day', 'Help at a health camp — registration, crowd flow, handing out medicines', 'Pack kits on a Sunday morning with twenty other people and good chai', 'Translate a document, design a poster, or write a grant from home'])}`,
        `• ${pick(['No teaching experience needed — we train you in a 90-minute orientation', 'We match you to a centre within about 3 km of where you live', 'Minimum commitment: one shift a fortnight'])}`,
        ``,
        `Currently most needed: ${opts.role || 'maths and English tutors, pharmacists for camps, photographers'}.`,
        ``,
        `Fill the form on our Volunteer page, or reply to this message. A coordinator calls within a week.`,
        contact,
      ].join('\n')
    }

    case 'thanks': {
      return [
        `**Subject:** Thank you — and here is what your ${money(opts.amount || 1000)} is doing`,
        ``,
        `Dear [donor name],`,
        ``,
        `Thank you. Your gift of ${money(opts.amount || 1000)} to ${program.title || 'our work'} has been received, and the receipt is attached${/80g/i.test(org.taxExemption || '') ? ' (80G valid for tax deduction)' : ''}.`,
        ``,
        `In practical terms, that is ${program.costPerUnit ? Math.max(1, Math.floor((opts.amount || 1000) / program.costPerUnit)) : 'several'} × ${program.unitLabel || 'a unit of impact'}. You will get a short note from us in three months telling you what it actually paid for — names and numbers, not adjectives.`,
        ``,
        `If you ever want to see the work in person, our centres run on weekday evenings and you are welcome to walk in.`,
        ``,
        `With gratitude,`,
        `[Your name]`,
        `${org.fullName}`,
      ].join('\n')
    }

    case 'event': {
      return [
        `**${events.title || 'Upcoming event'}**`,
        ``,
        `${events.date ? new Date(events.date).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' }) : '[date]'} · ${events.time || '[time]'} · ${events.location || '[venue]'}`,
        ``,
        `${events.excerpt || 'Join us. No experience needed, and no long-term commitment.'}`,
        ``,
        `**Who should come**`,
        `Anyone who has been meaning to help and has not known where to start. Children over 10 are welcome with a guardian.`,
        ``,
        `**What to bring**`,
        `Yourself, a water bottle, and a photo ID if you are registering someone else.`,
        ``,
        `**What happens after**`,
        `We send one follow-up message with photos and what the day achieved. If you want to keep coming, a coordinator will call you — if you do not, you will hear from us exactly once more.`,
        ``,
        `Register on our Events page. ${events.seats ? `${events.seats} seats.` : ''}`,
        contact,
      ].join('\n')
    }

    case 'report': {
      const alloc = content.impact?.allocation || []
      const yearly = content.impact?.yearly || []
      const latest = yearly[yearly.length - 1] || {}
      return [
        `**${org.fullName} — year in review**`,
        ``,
        `This year, across ${org.area}:`,
        ``,
        ...(stats || []).map((s) => `• **${s.value}${s.suffix || ''}** ${s.label.toLowerCase()}`),
        ``,
        `**Where the money went**`,
        ...alloc.map((a) => `• ${a.value}% — ${a.label}`),
        ``,
        `**Programme by programme**`,
        ...(content.programs || []).map(
          (p) => `• **${p.title}** — ${p.summary} ${(p.metrics || []).map((m) => `${m.value} ${m.label.toLowerCase()}`).join(', ')}`,
        ),
        ``,
        `**What did not work**`,
        `[Be honest here. One or two sentences about what you stopped doing and why. Donors trust this more than the successes.]`,
        ``,
        `**Next year**`,
        `[Three commitments you can be held to.]`,
        ``,
        `${latest.raised ? `We raised ${money(latest.raised)} and reached ${latest.people} people.` : ''} Audited financials are available on request.`,
        contact,
      ].join('\n')
    }

    case 'csr': {
      return [
        `**CSR partnership proposal — ${org.shortName} × [Company name]**`,
        ``,
        `**The ask.** ${money(opts.amount || 500000)} over 12 months for ${program.title || 'a named programme'}.`,
        ``,
        `**Why us.** ${org.fullName} has worked in ${org.area} since ${org.foundedYear}. ${program.summary || ''}`,
        ``,
        `**What the money buys.** ${money(program.costPerUnit)} ${program.unitLabel || 'per beneficiary'} — so ${money(opts.amount || 500000)} funds roughly ${program.costPerUnit ? Math.floor((opts.amount || 500000) / program.costPerUnit) : 0} people.`,
        ``,
        `**Reporting.** Quarterly utilisation certificates, a half-year field visit for your team, photographs with written consent, and a line in our annual report. We are CSR-1 registered and can supply all statutory documentation.`,
        ``,
        `**Employee engagement.** Two structured volunteering days a year (kit packing, a health camp, or a reading session), with transport and briefing handled by us.`,
        ``,
        `**Next step.** A 30-minute call, then a site visit. Write to ${org.email} or call ${org.phone}.`,
      ].join('\n')
    }

    default:
      return ''
  }
}

const BRIEF = {
  story: 'Write a field story / blog post (about 450 words) for this NGO about the given programme. Use a real, grounded tone: name the problem, the intervention, the cost per beneficiary, and an honest note about what is still needed. Use markdown headings and short paragraphs. Do not invent statistics or names — use [square brackets] where a real detail is needed.',
  appeal: 'Write a fundraising email (about 250 words) to the supporter list. One specific ask with a specific amount, the exact impact of that amount, a note on transparency, and a line making it easy to say no.',
  social: 'Write three social posts about the same announcement: one Instagram caption with hashtags, one LinkedIn post for a professional/CSR audience, one short X/Twitter post. Label each clearly.',
  volunteer: 'Write a volunteer recruitment post (about 200 words) for the given role. Be honest about the commitment, say what the person will actually do, and how to sign up.',
  thanks: 'Write a warm donor thank-you email (about 150 words) referencing the amount and its specific impact, the receipt, and an invitation to visit.',
  event: 'Write an event description (about 200 words) with who should come, what to bring, and what happens afterwards.',
  report: 'Write an annual impact summary (about 400 words) with headline numbers, allocation, programme-by-programme notes, an honest "what did not work" section and three commitments for next year.',
  csr: 'Write a concise CSR partnership proposal (about 350 words): the ask, why the NGO, what the money buys, reporting commitments, employee engagement and the next step.',
}

/** Build the LLM prompt for a studio template. */
export function studioPrompt(kind, content, opts = {}) {
  const org = content.org || {}
  const program = (content.programs || []).find((p) => p.slug === opts.program) || (content.programs || [])[0] || {}
  return [
    BRIEF[kind] || 'Write useful marketing copy for this NGO.',
    '',
    `Organisation: ${org.fullName} (${org.shortName}), a non-profit in ${org.city}. Tagline: ${org.tagline}. Areas: ${org.area}. Contact: ${org.email}, ${org.phone}.`,
    program.title ? `Programme: ${program.title}. ${program.summary} Cost: ₹${program.costPerUnit} ${program.unitLabel}. Metrics: ${(program.metrics || []).map((m) => `${m.label}: ${m.value}`).join('; ')}.` : '',
    opts.amount ? `Amount to reference: ₹${opts.amount}.` : '',
    opts.role ? `Role to recruit for: ${opts.role}.` : '',
    opts.notes ? `Extra instructions: ${opts.notes}` : '',
    '',
    'Tone: plain, warm, specific, no corporate jargon, no hype, Indian English. Use [square brackets] for any fact you do not have.',
  ]
    .filter(Boolean)
    .join('\n')
}

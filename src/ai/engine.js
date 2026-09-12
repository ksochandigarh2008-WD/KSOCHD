/**
 * AI ENGINE
 * Two ways to answer a visitor:
 *   • OFFLINE  — retrieval over your own site content. No key, no cost, works on
 *                any static host. Good enough for ~80% of visitor questions.
 *   • ONLINE   — same retrieved context is handed to an LLM (OpenAI / Groq /
 *                OpenRouter / Ollama / your own /ai/chat proxy) for natural answers.
 */

import { formatCurrency } from '../lib/utils'

/* ------------------------------------------------------------------ *
 * Providers
 * ------------------------------------------------------------------ */
export const PROVIDERS = {
  offline: {
    label: 'Offline (no API key)',
    baseUrl: '',
    models: [],
    note: 'Answers are retrieved verbatim from your site content. Free and private.',
  },
  openai: {
    label: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    models: ['gpt-4o-mini', 'gpt-4o', 'gpt-4.1-mini', 'o4-mini'],
    note: 'Get a key at platform.openai.com → API keys.',
  },
  groq: {
    label: 'Groq (fast, has a free tier)',
    baseUrl: 'https://api.groq.com/openai/v1',
    models: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'gemma2-9b-it', 'openai/gpt-oss-120b'],
    note: 'Free tier available at console.groq.com.',
  },
  openrouter: {
    label: 'OpenRouter',
    baseUrl: 'https://openrouter.ai/api/v1',
    models: ['anthropic/claude-3.5-haiku', 'meta-llama/llama-3.3-70b-instruct', 'google/gemini-flash-1.5'],
    note: 'One key for many models: openrouter.ai.',
  },
  ollama: {
    label: 'Ollama (self-hosted)',
    baseUrl: 'http://localhost:11434/v1',
    models: ['llama3.2', 'mistral', 'gemma2'],
    note: 'Run locally. Start with: OLLAMA_ORIGINS=* ollama serve',
  },
  custom: {
    label: 'Custom / your own backend',
    baseUrl: '',
    models: [],
    note: 'Any OpenAI-compatible endpoint. Recommended: proxy through your backend so the key stays server-side.',
  },
}

/* ------------------------------------------------------------------ *
 * Knowledge base
 * ------------------------------------------------------------------ */
const STOPWORDS = new Set(
  ('a an the is are was were be been being do does did doing have has had having i me my we our you your he she they them ' +
    'it its this that these those and but if or because as until while of at by for with about into to from in out on off ' +
    'then once here there all any both each few more most other some such no nor not only own same so than too very can will just ' +
    'how what when where who whom which why kso please tell me want need like know').split(' '),
)

/** Light stemmer so "clothes" matches "clothing" and "volunteering" matches "volunteer". */
const stem = (w) =>
  w.length > 4
    ? w
        .replace(/(ings|ing|edly|ed|ies|es|s)$/, (m) => (m === 'ies' ? 'y' : m === 'es' || m === 's' ? '' : ''))
        .replace(/s$/, '')
    : w

const tokenize = (text = '') =>
  [
    ...new Set(
      String(text)
        .toLowerCase()
        .replace(/[^a-z0-9₹\s]/g, ' ')
        .split(/\s+/)
        .filter((w) => w.length > 1 && !STOPWORDS.has(w))
        .map(stem),
    ),
  ].filter(Boolean)

/** Flatten site content into searchable { title, text, tags } chunks. */
export function buildKnowledge(content) {
  const chunks = []
  const push = (title, text, tags = '') => {
    const clean = String(text || '').replace(/\s+/g, ' ').trim()
    if (!clean) return
    chunks.push({ title, text: clean, tags: String(tags).toLowerCase(), tokens: tokenize(`${title} ${clean} ${tags}`) })
  }

  const org = content.org || {}
  push('About the organisation', `${org.fullName} (${org.shortName}) is a non-profit based in ${org.city}. ${org.tagline}. Founded ${org.foundedYear}.`, 'about org kso')
  push('Contact', `Address: ${org.address}. Phone: ${org.phone}. Email: ${org.email}. Office hours: ${org.hours}.`, 'contact address phone email office hours')
  push('Registration & tax', `${org.registration}. ${org.taxExemption}. ${org.fcra}.`, 'registration 80g tax exemption fcra legal')
  push('Donation methods', `UPI ID: ${org.upiId}. Bank: ${org.bankName}, account ${org.bankAccount}, IFSC ${org.bankIfsc}.`, 'donate donation payment upi bank transfer')
  push('Areas served', `KSO works across ${org.area}.`, 'area served location tricity chandigarh mohali panchkula')

  ;(content.programs || []).forEach((p) => {
    push(p.title, `${p.summary} ${p.body}`, `program programme ${p.slug} ${p.title}`)
    push(`${p.title} — cost`, `₹${p.costPerUnit} ${p.unitLabel}.`, `cost price donate ${p.slug}`)
  })
  ;(content.about?.values || []).forEach((v) => push(v.title, v.text, 'values principles'))
  ;(content.about?.milestones || []).forEach((m) => push(`${m.year} milestone`, m.text, 'history milestone'))
  ;(content.faqs || []).forEach((f) => push(f.q, f.a, 'faq question'))
  ;(content.events || []).forEach((e) =>
    push(`Event: ${e.title}`, `${e.date} at ${e.time}, ${e.location}. ${e.excerpt} ${e.body}`, `event ${e.category}`),
  )
  ;(content.stories || []).forEach((s) => push(s.title, `${s.excerpt} ${s.body}`, `story blog ${s.category}`))
  ;(content.team || []).forEach((t) => push(`${t.name} — ${t.role}`, t.bio, 'team member staff'))
  ;(content.impact?.allocation || []).forEach((a) =>
    push('Fund allocation', `${a.value}% goes to ${a.label}.`, 'allocation funds percentage overhead spends'),
  )
  ;(content.stats || []).forEach((s) => push('Impact statistic', `${s.value}${s.suffix} ${s.label}.`, 'stats impact numbers'))
  ;(content.donationPresets || []).forEach((amt) =>
    push(`What ₹${amt} does`, describeAmount(amt, content), `donate amount ${amt}`),
  )

  if (content.ai?.extraKnowledge) push('Additional notes', content.ai.extraKnowledge, 'notes')
  return chunks
}

/** Impact maths used by the donor helper. */
export function describeAmount(amount, content) {
  const programs = content.programs || []
  if (!programs.length) return ''
  const parts = programs
    .map((p) => {
      const n = Math.floor(amount / (p.costPerUnit || 1))
      if (n < 1) return null
      const label = p.costPerUnit && p.unitLabel ? p.unitLabel : `supports ${p.title}`
      return `${n} × ${label}`
    })
    .filter(Boolean)
  const best = (content.programs || [])
    .filter((p) => p.costPerUnit && amount >= p.costPerUnit)
    .sort((a, b) => b.costPerUnit - a.costPerUnit)[0]
  const main = best
    ? `roughly ${Math.max(1, Math.floor(amount / best.costPerUnit))} × ${best.unitLabel}`
    : 'a contribution to our general fund'
  return `${formatCurrency(amount)} is ${main}. ${parts.length ? `Break-down: ${parts.join('; ')}.` : ''}`.trim()
}

/* ------------------------------------------------------------------ *
 * Retrieval (BM25-lite scoring)
 * ------------------------------------------------------------------ */
export function retrieve(query, chunks, k = 4) {
  const qTokens = tokenize(query)
  if (!qTokens.length) return []
  const idf = {}
  chunks.forEach((c) => {
    new Set(c.tokens).forEach((t) => (idf[t] = (idf[t] || 0) + 1))
  })
  const N = chunks.length || 1
  const scored = chunks.map((c) => {
    const tf = {}
    c.tokens.forEach((t) => (tf[t] = (tf[t] || 0) + 1))
    let score = 0
    let matched = 0
    qTokens.forEach((t) => {
      if (!tf[t]) return
      matched += 1
      const idfScore = Math.log(1 + N / (1 + (idf[t] || 0)))
      score += (1 + Math.log(tf[t])) * idfScore
    })
    // small boost for title matches
    const titleTokens = tokenize(c.title)
    qTokens.forEach((t) => {
      if (titleTokens.includes(t)) score += 1.5
    })
    return { ...c, score, matched, coverage: matched / qTokens.length }
  })
  return scored
    .filter((c) => c.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, k)
}

/**
 * Is this match strong enough to show? Guards against answering a question
 * that shares one common word with an unrelated passage.
 */
const isConfident = (hit, queryTokens) => hit && hit.score >= 2.6 && hit.coverage >= Math.min(0.5, 1 / queryTokens)

/* ------------------------------------------------------------------ *
 * Intent handling for a nicer offline experience
 * ------------------------------------------------------------------ */
const intents = [
  // NOTE: `tax` must be tested before `donate` — "is my donation tax deductible?"
  // should get the 80G answer, not the generic donation blurb.
  {
    id: 'tax',
    test: (q) => /80g|80 g|tax|deduct|exempt|receipt|pan|form 10/i.test(q),
    answer: (content) => {
      const org = content.org || {}
      return [
        `${org.taxExemption || 'Add your 80G details in Admin → Content → Organisation.'}`,
        `Share your PAN and email at the time of donation; receipts are issued within 48 hours and can be re-issued on request at ${org.email}.`,
      ].join('\n')
    },
  },
  {
    id: 'money-use',
    test: (q) => /where.*(money|donation|fund|go)|allocation|overhead|admin cost|spend|utilis|utiliz|audit|report/i.test(q),
    answer: (content) => {
      const alloc = content.impact?.allocation || []
      const lines = alloc.map((a) => `• ${a.value}% — ${a.label}`)
      return [
        'Every rupee is tagged to a programme and our books are audited annually.',
        ...lines,
        `Audited financials and annual reports are published on the Impact page. ${content.impact?.note || ''}`,
      ].join('\n')
    },
  },
  {
    id: 'donate',
    test: (q) => /donat|give|contribut|payment|upi|pay|fund|₹|rs\.?\s?\d|sponsor/i.test(q),
    answer: (content) => {
      const org = content.org || {}
      const presets = content.donationPresets || []
      const lines = presets.slice(0, 4).map((a) => `• ${formatCurrency(a)} — ${describeAmount(a, content).split('.')[0]}`)
      return [
        `You can donate on the Donate page — one-time or monthly, by UPI, card or bank transfer.`,
        ...lines,
        `UPI ID: **${org.upiId}** · Bank: ${org.bankName}, A/C ${org.bankAccount}, IFSC ${org.bankIfsc}.`,
        `Donations are ${/80g/i.test(org.taxExemption || '') ? '80G tax-exempt' : 'eligible for a receipt'}, and the receipt reaches you by email within 48 hours.`,
      ].join('\n')
    },
  },
  {
    id: 'volunteer',
    test: (q) => /volunteer|volunt|help out|join|intern|internship|seva|contribute time/i.test(q),
    answer: (content) =>
      [
        `Yes — and most of our volunteers have full-time jobs.`,
        `Learning centres run on weekday evenings and Saturday mornings; events and relief drives are mostly weekends. Remote roles exist in writing, design, translation and mentoring.`,
        `Fill the form on the Volunteer page and a coordinator will call you within a week. Minimum commitment is one two-hour shift a fortnight.`,
        `Contact: ${content.org?.email} · ${content.org?.phone}`,
      ].join('\n'),
  },
  {
    id: 'events',
    test: (q) => /event|camp|marathon|drive|upcoming|next|when|schedule|register/i.test(q),
    answer: (content) => {
      const evs = (content.events || []).slice().sort((a, b) => new Date(a.date) - new Date(b.date))
      if (!evs.length) return 'No events are scheduled right now — please check back or follow us on social media.'
      return ['Here is what is on:', ...evs.map((e) => `• **${e.title}** — ${e.date}, ${e.time}. ${e.location}`), 'Registration is on the Events page.'].join('\n')
    },
  },
  {
    id: 'contact',
    test: (q) => /contact|address|email|phone|call|where are you|office|location|reach/i.test(q),
    answer: (content) => {
      const o = content.org || {}
      return [`**${o.fullName}**`, o.address, `Phone: ${o.phone}`, `Email: ${o.email}`, `Office hours: ${o.hours}`].join('\n')
    },
  },
]

const FALLBACKS = [
  'I could not find that in our published information. The team will know — write to EMAIL and someone will reply within two working days.',
  'That is not something I have on file. Please contact EMAIL or call PHONE and the team will help you directly.',
]

/** Offline answer: intent first, then retrieved passages. */
export function answerOffline(query, content, chunks) {
  const email = content.org?.email || ''
  const phone = content.org?.phone || ''
  for (const intent of intents) {
    if (intent.test(query)) {
      return { text: intent.answer(content), intent: intent.id, sources: [] }
    }
  }
  const hits = retrieve(query, chunks, 3)
  if (isConfident(hits[0], tokenize(query).length)) {
    const best = hits[0]
    const text = best.title && !/^About the organisation$/.test(best.title)
      ? `**${best.title}**\n${best.text}`
      : best.text
    const more = hits
      .slice(1)
      .map((h) => h.title)
      .filter(Boolean)
    return {
      text: more.length ? `${text}\n\n_Related: ${more.join(' · ').slice(0, 160)}_` : text,
      intent: 'retrieval',
      sources: hits,
    }
  }
  const fb = FALLBACKS[Math.floor(Math.random() * FALLBACKS.length)]
    .replace('EMAIL', email || 'us')
    .replace('PHONE', phone || 'the office')
  return { text: fb, intent: 'fallback', sources: [] }
}

/* ------------------------------------------------------------------ *
 * Online (LLM) call — OpenAI-compatible chat completions
 * ------------------------------------------------------------------ */
export async function chatOnline({ messages, context, ai, signal }) {
  const key = (ai.apiKey || '').trim()
  if (!key && ai.provider !== 'ollama' && ai.provider !== 'custom') {
    throw new Error('no-key')
  }
  const system = [
    ai.systemPrompt,
    context ? `\n\nCONTEXT (source of truth — only from KSO’s own published content):\n${context}` : '',
    ai.extraKnowledge ? `\n\nADDITIONAL NOTES:\n${ai.extraKnowledge}` : '',
  ]
    .filter(Boolean)
    .join('\n')

  const body = {
    model: ai.model,
    messages: [{ role: 'system', content: system }, ...messages],
    temperature: Number(ai.temperature ?? 0.4),
    max_tokens: 500,
    stream: false,
  }

  const res = await fetch(`${ai.baseUrl.replace(/\/+$/, '')}/chat/completions`, {
    method: 'POST',
    signal,
    headers: {
      'Content-Type': 'application/json',
      ...(key ? { Authorization: `Bearer ${key}` } : {}),
      ...(ai.provider === 'openrouter'
        ? { 'HTTP-Referer': window.location.origin, 'X-Title': 'KSO Website Assistant' }
        : {}),
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.text().catch(() => '')
    throw new Error(`${res.status}: ${err.slice(0, 200)}`)
  }
  const data = await res.json()
  const text = data?.choices?.[0]?.message?.content?.trim()
  if (!text) throw new Error('empty-response')
  return text
}

/** Build the context string sent to the LLM from retrieved passages. */
export const contextFromChunks = (chunks) =>
  chunks
    .map((c) => `- ${c.title ? `${c.title}: ` : ''}${c.text}`)
    .join('\n')
    .slice(0, 3500)

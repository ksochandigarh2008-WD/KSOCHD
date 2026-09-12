import { useState, useRef, useEffect } from 'react'
import {
  Sparkles, Send, Key, Copy, Check, Wand2, FilePlus2, RefreshCw, AlertTriangle, Trash2,
} from 'lucide-react'
import { useSite } from '../../store/useSite'
import { Panel, TF, TA, SEL } from './components'
import { useToast, RichText, Toggle } from '../../components/ui'
import { PROVIDERS, buildKnowledge, retrieve, answerOffline, chatOnline, contextFromChunks } from '../../ai/engine'
import { STUDIO_TEMPLATES, generateOffline, studioPrompt } from '../../ai/studio'
import { cn, copyToClipboard, uid, slugify } from '../../lib/utils'

function TestChat() {
  const ai = useSite((s) => s.ai)
  const content = useSite((s) => s.content)
  const [msgs, setMsgs] = useState([{ id: 'a0', role: 'assistant', text: 'Ask me anything a visitor might ask. This uses the exact same settings as the public widget.' }])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const box = useRef(null)
  const chunks = buildKnowledge(content)
  const online = ai.provider !== 'offline' && (ai.apiKey || ai.provider === 'ollama' || ai.provider === 'custom')

  useEffect(() => { if (box.current) box.current.scrollTop = box.current.scrollHeight }, [msgs, busy])

  const send = async (raw) => {
    const text = String(raw ?? input).trim()
    if (!text || busy) return
    setInput(''); setErr(''); setBusy(true)
    const history = [...msgs, { id: uid('m'), role: 'user', text }]
    setMsgs(history)
    try {
      if (online) {
        const hits = retrieve(text, chunks, 5)
        const reply = await chatOnline({
          messages: history.filter((m) => m.id !== 'a0').map((m) => ({ role: m.role, content: m.text })),
          context: contextFromChunks(hits),
          ai: { ...ai, extraKnowledge: content.ai?.extraKnowledge || '' },
        })
        setMsgs((m) => [...m, { id: uid('m'), role: 'assistant', text: reply }])
      } else {
        await new Promise((r) => setTimeout(r, 250))
        const { text: reply } = answerOffline(text, content, chunks)
        setMsgs((m) => [...m, { id: uid('m'), role: 'assistant', text: reply }])
      }
    } catch (e) {
      setErr(String(e.message || e))
      const { text: reply } = answerOffline(text, content, chunks)
      setMsgs((m) => [...m, { id: uid('m'), role: 'assistant', text: `${reply}` }])
    } finally {
      setBusy(false)
    }
  }

  return (
    <Panel title="Test the assistant" desc="Same engine, same knowledge base as the public widget">
      <div ref={box} className="h-72 space-y-3 overflow-y-auto rounded-xl border border-ink-900/10 bg-ink-900/[0.02] p-3">
        {msgs.map((m) => (
          <div key={m.id} className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}>
            <div className={cn('max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[13.5px]',
              m.role === 'user' ? 'rounded-br-sm bg-brand-700 text-white' : 'rounded-bl-sm border border-ink-900/5 bg-white')}>
              <RichText text={m.text} />
            </div>
          </div>
        ))}
        {busy && <p className="text-xs text-ink-500">Thinking…</p>}
      </div>
      {err && <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">Error: {err}</p>}
      <form onSubmit={(e) => { e.preventDefault(); send() }} className="mt-3 flex gap-2">
        <input className="field" value={input} onChange={(e) => setInput(e.target.value)} placeholder="How do I volunteer?" />
        <button className="btn-primary px-4" disabled={busy}><Send className="h-4 w-4" /></button>
      </form>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {['How do I volunteer?', 'Where does my donation go?', 'Is my donation tax deductible?', 'What events are coming up?'].map((s) => (
          <button key={s} onClick={() => send(s)} className="rounded-full bg-ink-900/5 px-2.5 py-1 text-[11.5px] font-medium text-ink-700 hover:bg-ink-900/10">{s}</button>
        ))}
      </div>
      <button onClick={() => setMsgs([{ id: 'a0', role: 'assistant', text: 'Conversation cleared.' }])} className="mt-3 text-xs font-semibold text-ink-500 hover:underline">
        <Trash2 className="mr-1 inline h-3 w-3" /> Clear
      </button>
    </Panel>
  )
}

function Studio() {
  const ai = useSite((s) => s.ai)
  const content = useSite((s) => s.content)
  const addListItem = useSite((s) => s.addListItem)
  const toast = useToast()
  const [kind, setKind] = useState('story')
  const [program, setProgram] = useState(content.programs?.[0]?.slug || '')
  const [amount, setAmount] = useState(5000)
  const [role, setRole] = useState('maths and English tutors')
  const [notes, setNotes] = useState('')
  const [out, setOut] = useState('')
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)
  const online = ai.provider !== 'offline' && Boolean(ai.apiKey)

  const generate = async () => {
    setBusy(true); setOut('')
    try {
      if (online) {
        const reply = await chatOnline({
          messages: [{ role: 'user', content: studioPrompt(kind, content, { program, amount, role, notes }) }],
          context: '',
          ai: { ...ai, temperature: 0.7, extraKnowledge: content.ai?.extraKnowledge || '' },
        })
        setOut(reply)
      } else {
        await new Promise((r) => setTimeout(r, 400))
        setOut(generateOffline(kind, content, { program, amount, role, notes }))
      }
    } catch (e) {
      toast(`AI error: ${e.message}`, 'error')
      setOut(generateOffline(kind, content, { program, amount, role, notes }))
    } finally {
      setBusy(false)
    }
  }

  const insertAsStory = () => {
    const lines = String(out).split('\n')
    const title = (lines.find((l) => l.startsWith('## ')) || lines[0] || 'New story').replace(/^#+\s*/, '')
    addListItem('stories', {
      slug: slugify(title).slice(0, 50) || `story-${uid('').slice(1, 5)}`,
      title,
      date: new Date().toISOString().slice(0, 10),
      author: 'KSO Team',
      category: 'Impact',
      image: '',
      excerpt: lines.filter(Boolean).slice(2, 4).join(' ').replace(/[*_#]/g, '').slice(0, 180),
      body: out,
      featured: false,
    })
    toast('Saved as a draft story — review it in Programmes · Events · Stories → Stories')
  }

  return (
    <Panel
      title={<span className="flex items-center gap-2"><Wand2 className="h-4 w-4" /> AI content studio</span>}
      desc={online ? `Drafting with ${ai.provider} · ${ai.model}` : 'Drafting offline from your site content — add an API key for richer output'}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <SEL label="What do you need?" value={kind} onChange={setKind} options={STUDIO_TEMPLATES.map((t) => ({ value: t.id, label: t.label }))} />
        <SEL label="Programme" value={program} onChange={setProgram} options={[{ value: '', label: 'General' }, ...(content.programs || []).map((p) => ({ value: p.slug, label: p.title }))]} />
        <TF label="Amount to reference (₹)" type="number" value={amount} onChange={setAmount} />
        <TF label="Volunteer role (if relevant)" value={role} onChange={setRole} />
        <TF label="Extra instructions" value={notes} onChange={setNotes} className="sm:col-span-2" placeholder="Mention the monsoon drive, keep it under 200 words…" />
      </div>

      <p className="mt-3 rounded-xl bg-ink-900/[0.03] p-3 text-xs text-ink-600">
        {STUDIO_TEMPLATES.find((t) => t.id === kind)?.hint}
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <button onClick={generate} disabled={busy} className="btn-primary">
          {busy ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {busy ? 'Drafting…' : 'Generate draft'}
        </button>
        {out && (
          <>
            <button
              onClick={async () => { const ok = await copyToClipboard(out); setCopied(ok); toast(ok ? 'Copied' : 'Copy failed', ok ? 'success' : 'error'); setTimeout(() => setCopied(false), 2000) }}
              className="btn-ghost"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} Copy
            </button>
            <button onClick={insertAsStory} className="btn-ghost"><FilePlus2 className="h-4 w-4" /> Save as draft story</button>
          </>
        )}
      </div>

      {out && (
        <div className="mt-4 rounded-xl border border-ink-900/10 bg-white p-4">
          <pre className="whitespace-pre-wrap font-sans text-[13.5px] leading-relaxed text-ink-800">{out}</pre>
        </div>
      )}
    </Panel>
  )
}

export default function AiTab() {
  const ai = useSite((s) => s.ai)
  const settings = useSite((s) => s.settings)
  const content = useSite((s) => s.content)
  const setAi = useSite((s) => s.setAi)
  const setSettings = useSite((s) => s.setSettings)
  const toast = useToast()
  const provider = PROVIDERS[ai.provider] || PROVIDERS.offline
  const usingKey = Boolean(ai.apiKey)

  const switchProvider = (id) => {
    const p = PROVIDERS[id] || {}
    setAi({ provider: id, baseUrl: p.baseUrl || ai.baseUrl, model: p.models?.[0] || ai.model })
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-bold">AI assistant</h1>
        <p className="text-sm text-ink-500">The chat widget visitors see, and the content studio your team uses.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {Object.entries(PROVIDERS).map(([id, p]) => (
          <button
            key={id}
            onClick={() => switchProvider(id)}
            className={cn('rounded-xl px-4 py-2.5 text-sm font-semibold transition',
              ai.provider === id ? 'bg-brand-700 text-white' : 'border border-ink-900/10 bg-white text-ink-700 hover:bg-ink-900/5')}
          >
            {p.label}
          </button>
        ))}
      </div>

      <Panel title="Visibility & behaviour">
        <div className="space-y-3">
          <Toggle label="Show the AI widget on the public site" hint="Visitors see the chat bubble in the bottom-right corner."
            checked={settings.aiWidgetEnabled} onChange={(v) => setSettings({ aiWidgetEnabled: v })} />
          <div className="grid gap-3 sm:grid-cols-2">
            <TF label="Assistant name" value={ai.personaName} onChange={(v) => setAi({ personaName: v })} />
            <TF label="Greeting" value={ai.greeting} onChange={(v) => setAi({ greeting: v })} />
          </div>
          <TA label="Suggested questions" rows={2} value={(ai.suggestions || []).join('\n')}
            onChange={(v) => setAi({ suggestions: v.split('\n').map((s) => s.trim()).filter(Boolean).slice(0, 6) })}
            hint="One per line — up to six. These appear as chips under the greeting." />
        </div>
      </Panel>

      {ai.provider !== 'offline' ? (
        <Panel title={<span className="flex items-center gap-2"><Key className="h-4 w-4" /> Connection</span>} desc={provider.note}>
          <div className="grid gap-3 sm:grid-cols-2">
            <TF label="Base URL" value={ai.baseUrl} onChange={(v) => setAi({ baseUrl: v })} hint="OpenAI-compatible endpoint" className="sm:col-span-2" />
            {provider.models?.length ? (
              <SEL label="Model" value={ai.model} onChange={(v) => setAi({ model: v })} options={provider.models} />
            ) : (
              <TF label="Model" value={ai.model} onChange={(v) => setAi({ model: v })} />
            )}
            <TF label="Temperature" type="number" value={ai.temperature} onChange={(v) => setAi({ temperature: v })} hint="0 = factual, 0.8 = creative" />
            <div className="sm:col-span-2">
              <TF label="API key" type="password" value={ai.apiKey} onChange={(v) => setAi({ apiKey: v })}
                hint="Stored only in this browser's localStorage. Nothing is sent anywhere except the provider you choose." />
            </div>
          </div>

          {ai.provider !== 'custom' && ai.provider !== 'ollama' && (
            <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-3.5">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
              <p className="text-xs leading-relaxed text-amber-900">
                A key entered here lives in the visitor’s browser, so anyone who opens DevTools can read it. That is
                fine for a small site with a rate-limited key. For production, set <strong>VITE_API_BASE_URL</strong> to
                your own backend and proxy calls through <code>/ai/chat</code> — the app switches automatically and the
                key never leaves your server. See DEPLOY.md.
              </p>
            </div>
          )}

          {usingKey && (
            <button onClick={() => { setAi({ apiKey: '' }); toast('API key removed') }} className="mt-3 text-xs font-semibold text-red-600 hover:underline">
              Remove stored key
            </button>
          )}
        </Panel>
      ) : (
        <Panel title="Offline mode" desc="No key, no cost, nothing leaves the visitor's browser.">
          <p className="text-sm leading-relaxed text-ink-700">
            The assistant retrieves answers directly from your own content — programmes, FAQs, events, contact details
            and donation costs — and scores them against the visitor’s question. It handles the common questions
            (volunteering, donations, 80G, events, where money goes) with purpose-written answers, and falls back to
            the closest matching passage otherwise. If it cannot find an answer, it hands the visitor your email
            rather than inventing one.
          </p>
          <p className="mt-3 text-xs text-ink-500">
            Knowledge base currently holds {buildKnowledge(content).length} passages. Add more content — or extra notes
            in Site content → SEO — and the assistant gets better automatically.
          </p>
        </Panel>
      )}

      <Panel title="System prompt" desc="The rules the model follows. Edit freely.">
        <TA rows={7} value={ai.systemPrompt} onChange={(v) => setAi({ systemPrompt: v })} />
      </Panel>

      <TestChat />
      <Studio />
    </div>
  )
}

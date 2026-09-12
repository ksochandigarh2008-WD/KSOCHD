import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bot, X, Send, Sparkles, Trash2 } from 'lucide-react'
import { useSite, useContent } from '../store/useSite'
import { buildKnowledge, retrieve, answerOffline, chatOnline, contextFromChunks, describeAmount, PROVIDERS } from '../ai/engine'
import { cn, uid } from '../lib/utils'

const seedGreeting = (ai) => [
  { id: 'm0', role: 'assistant', text: ai.greeting || 'Hello! How can I help?' },
]

export default function ChatWidget() {
  const ai = useSite((s) => s.ai)
  const settings = useSite((s) => s.settings)
  const content = useContent()
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState(() => seedGreeting(ai))
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const scroller = useRef(null)
  const abort = useRef(null)

  const chunks = useMemo(() => buildKnowledge(content), [content])
  const online = ai.provider !== 'offline' && (ai.apiKey || ai.provider === 'ollama' || ai.provider === 'custom')

  useEffect(() => {
    if (scroller.current) scroller.current.scrollTop = scroller.current.scrollHeight
  }, [messages, busy, open])

  const send = async (raw) => {
    const text = String(raw ?? input).trim()
    if (!text || busy) return
    setInput('')
    setError('')
    const history = [...messages.filter((m) => m.role !== 'system'), { id: uid('m'), role: 'user', text }]
    setMessages((m) => [...m, history[history.length - 1]])
    setBusy(true)

    try {
      if (online) {
        const hits = retrieve(text, chunks, 5)
        const apiMessages = history
          .filter((m) => m.id !== 'm0')
          .map((m) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.text }))
        abort.current = new AbortController()
        const reply = await chatOnline({
          messages: apiMessages,
          context: contextFromChunks(hits),
          ai: { ...ai, extraKnowledge: content.ai?.extraKnowledge || '' },
          signal: abort.current.signal,
        })
        setMessages((m) => [...m, { id: uid('m'), role: 'assistant', text: reply }])
      } else {
        // small delay so it feels like it is thinking (and lets the typing dot show)
        await new Promise((r) => setTimeout(r, 320))
        const { text: reply } = answerOffline(text, content, chunks)
        setMessages((m) => [...m, { id: uid('m'), role: 'assistant', text: reply }])
      }
    } catch (err) {
      if (err.name === 'AbortError') return setBusy(false)
      if (err.message === 'no-key') {
        setError('No API key set — enable it in Admin → AI Assistant.')
      } else if (err.message?.startsWith('401')) {
        setError('The API key was rejected (401). Check Admin → AI Assistant → API key.')
      } else if (err.message?.startsWith('429')) {
        setError('Rate limited or out of credit on the AI provider.')
      } else if (String(err.message).includes('Failed to fetch')) {
        setError('Could not reach the AI provider (network or CORS). A backend proxy fixes this.')
      } else {
        setError(`AI error: ${err.message}`.slice(0, 160))
      }
      // graceful degradation: fall back to the offline answer
      const { text: reply } = answerOffline(text, content, chunks)
      setMessages((m) => [...m, { id: uid('m'), role: 'assistant', text: reply }])
    } finally {
      setBusy(false)
    }
  }

  const reset = () => {
    abort.current?.abort()
    setBusy(false)
    setError('')
    setMessages(seedGreeting(ai))
  }

  if (!settings.aiWidgetEnabled) return null

  const suggestAmount = (amount) => {
    send(`What does a donation of ${amount} rupees do?`)
  }

  return (
    <>
      {/* launcher */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-5 right-5 z-[70] flex items-center gap-2 rounded-full bg-brand-700 px-4 py-3.5 text-sm font-semibold text-white shadow-lift transition hover:bg-brand-800 active:scale-95"
          aria-label="Open AI assistant"
        >
          <Bot className="h-5 w-5" />
          <span className="hidden sm:inline">Ask KSO</span>
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-accent-400" />
          </span>
        </button>
      )}

      {open && (
        <div className="fixed bottom-0 right-0 z-[70] flex h-[min(80vh,620px)] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-lift animate-pop-in sm:bottom-5 sm:right-5 sm:h-[600px] sm:w-[384px] sm:rounded-2xl">
          {/* header */}
          <div className="flex items-center gap-3 bg-gradient-to-r from-brand-800 to-brand-700 px-4 py-3.5 text-white">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/15">
              <Sparkles className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{ai.personaName}</p>
              <p className="flex items-center gap-1.5 text-[11px] text-white/70">
                <span className={cn('inline-block h-1.5 w-1.5 rounded-full', online ? 'bg-emerald-400' : 'bg-accent-400')} />
                {online ? `${PROVIDERS[ai.provider]?.label || ai.provider} · ${ai.model}` : 'Offline · answers from KSO content'}
              </p>
            </div>
            <button onClick={reset} className="rounded-lg p-1.5 hover:bg-white/10" aria-label="Clear conversation">
              <Trash2 className="h-4 w-4" />
            </button>
            <button onClick={() => setOpen(false)} className="rounded-lg p-1.5 hover:bg-white/10" aria-label="Close chat">
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* messages */}
          <div ref={scroller} className="flex-1 space-y-3 overflow-y-auto bg-ink-900/[0.02] px-4 py-4">
            {messages.map((m) => (
              <div key={m.id} className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}>
                <div
                  className={cn(
                    'max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-[13.5px] leading-relaxed',
                    m.role === 'user'
                      ? 'rounded-br-sm bg-brand-700 text-white'
                      : 'rounded-bl-sm border border-ink-900/5 bg-white text-ink-900 shadow-sm',
                  )}
                >
                  {m.text.split(/(\*\*[^*]+\*\*|_[^_]+_)/g).map((part, i) => {
                    if (part.startsWith('**') && part.endsWith('**')) return <strong key={i}>{part.slice(2, -2)}</strong>
                    if (part.startsWith('_') && part.endsWith('_')) return <em key={i} className="text-ink-500">{part.slice(1, -1)}</em>
                    return <span key={i}>{part}</span>
                  })}
                </div>
              </div>
            ))}
            {busy && (
              <div className="flex justify-start">
                <div className="flex gap-1 rounded-2xl rounded-bl-sm border border-ink-900/5 bg-white px-4 py-3 shadow-sm">
                  {[0, 150, 300].map((d) => (
                    <span
                      key={d}
                      className="h-1.5 w-1.5 animate-bounce rounded-full bg-brand-600"
                      style={{ animationDelay: `${d}ms` }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* error */}
          {error && (
            <p className="border-t border-red-100 bg-red-50 px-4 py-2 text-[11px] text-red-700">{error}</p>
          )}

          {/* suggestions */}
          {messages.length <= 2 && (
            <div className="flex flex-wrap gap-1.5 border-t border-ink-900/5 px-4 py-2.5">
              {(ai.suggestions || []).slice(0, 4).map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="rounded-full border border-brand-200 bg-brand-50/60 px-2.5 py-1 text-[11.5px] font-medium text-brand-700 transition hover:bg-brand-100"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* quick amounts */}
          <div className="flex gap-1.5 overflow-x-auto px-4 pb-1 no-scrollbar">
            {(content.donationPresets || []).slice(0, 4).map((a) => (
              <button
                key={a}
                onClick={() => suggestAmount(a)}
                className="shrink-0 rounded-full bg-ink-900/5 px-2.5 py-1 text-[11px] font-semibold text-ink-700 hover:bg-ink-900/10"
                title={describeAmount(a, content)}
              >
                ₹{a.toLocaleString('en-IN')}
              </button>
            ))}
          </div>

          {/* input */}
          <form
            onSubmit={(e) => {
              e.preventDefault()
              send()
            }}
            className="flex items-center gap-2 border-t border-ink-900/5 bg-white px-3 py-2.5"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about donations, volunteering, events…"
              className="flex-1 rounded-full border border-ink-900/10 px-3.5 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              aria-label="Message"
            />
            <button
              type="submit"
              disabled={busy || !input.trim()}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-700 text-white transition hover:bg-brand-800 disabled:opacity-40"
              aria-label="Send"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
          <p className="bg-white px-4 pb-2.5 text-center text-[10px] text-ink-500">
            AI answers are generated from KSO’s published content.{' '}
            <Link to="/contact" className="underline" onClick={() => setOpen(false)}>Talk to a human</Link>
          </p>
        </div>
      )}
    </>
  )
}

import { useRef, useState, useEffect } from 'react'
import {
  Palette, Download, Upload, RotateCcw, ShieldCheck, Image as ImageIcon, Globe, Copy, Check,
  ExternalLink, Terminal, Server, Github, Trash2, UserPlus, KeyRound, Stamp, ScrollText,
  BellRing, Send, Rocket, AlertTriangle, Hammer, BarChart3,
} from 'lucide-react'
import { useSite } from '../../store/useSite'
import { Panel, TF, TA, SEL } from './components'
import { useToast, Toggle } from '../../components/ui'
import { ConfirmDialog, Button, Badge } from '../../components/admin/ui'
import { complianceSchema, fieldErrors } from './schemas'
import { sendTestNotification } from '../../lib/notifications'
import { goLiveChecklist, blockingIssues, productionRestrictions, isProduction } from '../../lib/production'
import { downloadFile, readFileAsDataURL, copyToClipboard, cn } from '../../lib/utils'
import { toCSV } from '../../lib/finance'
import { complianceOf, missingCompliance } from '../../lib/documents'

const PRESETS = [
  { name: 'Tricity Teal', brand: '#0f766e', accent: '#f59e0b' },
  { name: 'Indigo', brand: '#4338ca', accent: '#f59e0b' },
  { name: 'Forest', brand: '#15803d', accent: '#eab308' },
  { name: 'Saffron & Ink', brand: '#c2410c', accent: '#0ea5e9' },
  { name: 'Rose', brand: '#be123c', accent: '#f59e0b' },
  { name: 'Slate', brand: '#334155', accent: '#f59e0b' },
]

export default function SystemTab() {
  const theme = useSite((s) => s.theme)
  const settings = useSite((s) => s.settings)
  const content = useSite((s) => s.content)
  const memberships = useSite((s) => s.memberships)
  const submissions = useSite((s) => s.submissions)
  const transactions = useSite((s) => s.transactions)
  const audit = useSite((s) => s.audit) || []
  const setTheme = useSite((s) => s.setTheme)
  const setSettings = useSite((s) => s.setSettings)
  const addAdminUser = useSite((s) => s.addAdminUser)
  const removeAdminUser = useSite((s) => s.removeAdminUser)
  const changeOwnPassword = useSite((s) => s.changeOwnPassword)
  const currentUser = useSite((s) => s.currentUser)
  const exportAll = useSite((s) => s.exportAll)
  const importAll = useSite((s) => s.importAll)
  const resetEverything = useSite((s) => s.resetEverything)
  const toast = useToast()
  const fileRef = useRef(null)
  const logoRef = useRef(null)
  const [pw, setPw] = useState({ current: '', next: '', confirm: '' })
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'Editor' })
  const [copied, setCopied] = useState('')
  const [confirmReset, setConfirmReset] = useState(false)

  const compliance = complianceOf(settings)
  const missing = missingCompliance(compliance, content.org || {})
  const setCompliance = (key, value) => setSettings({ compliance: { ...compliance, [key]: value } })
  const production = isProduction(settings)
  const checklist = goLiveChecklist({ settings, content, memberships, transactions })
  const left = blockingIssues(checklist)
  const warnings = checklist.filter((i) => !i.blocking && !i.done)

  const analytics = settings.analytics || {}
  const setAnalytics = (patch) => setSettings({ analytics: { ...analytics, ...patch } })

  const maintenance = settings.maintenance || {}
  const setMaintenance = (patch) => setSettings({ maintenance: { ...maintenance, ...patch } })

  const notifications = settings.notifications || {}
  const setNotif = (key, value) => setSettings({ notifications: { ...notifications, [key]: value } })

  /** Format problems in the statutory block. Reported, not enforced — but a wrong PAN
   *  prints on every receipt, so it is worth saying loudly. */
  const complianceErrors = fieldErrors(complianceSchema, compliance)

  const onImport = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const text = await file.text()
    const res = importAll(text)
    if (res.ok) toast('Backup restored')
    else toast(`Import failed: ${res.error}`, 'error')
    e.target.value = ''
  }

  const onLogo = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 1_000_000) return toast('Logo should be under 1 MB', 'error')
    const data = await readFileAsDataURL(file)
    setSettings({ logo: data })
    toast('Logo updated')
  }

  // ⌘K palette hook (Admin → Search)
  const exportRef = useRef(null)
  exportRef.current = () => {
    downloadFile(`kso-backup-${new Date().toISOString().slice(0, 10)}.json`, exportAll())
    toast('Backup downloaded')
  }
  useEffect(() => {
    const h = () => exportRef.current?.()
    window.addEventListener('kso:export-backup', h)
    return () => window.removeEventListener('kso:export-backup', h)
  }, [])

  const copy = async (text, key) => {
    const ok = await copyToClipboard(text)
    setCopied(ok ? key : '')
    toast(ok ? 'Copied to clipboard' : 'Copy failed', ok ? 'success' : 'error')
    setTimeout(() => setCopied(''), 2000)
  }

  const commands = [
    ['Install & run locally', 'cd kso-website\nnpm install\nnpm run dev'],
    ['Production build', 'npm run build      # output in /dist'],
    ['Vercel', 'npm i -g vercel\nvercel --prod'],
    ['Netlify', 'npm i -g netlify-cli\nnetlify deploy --prod --dir=dist'],
    ['GitHub Pages', 'BASE_PATH=/kso-website npm run build\nnpm run deploy:pages'],
    ['CloudFront / S3', 'npm run build\naws s3 sync dist s3://your-bucket --delete\naws cloudfront create-invalidation --distribution-id XXXX --paths "/*"'],
  ]

  return (
    <div className="space-y-5">
      <ConfirmDialog
        open={confirmReset}
        onOpenChange={setConfirmReset}
        title="Reset everything?"
        description="Every section goes back to the original demo content, including accounts, members, transactions and vouchers. Export a backup first — this cannot be undone."
        confirmLabel="Reset the site"
        destructive
        onConfirm={() => { resetEverything(); setConfirmReset(false); toast('Site reset') }}
      />
      <div>
        <h1 className="font-display text-2xl font-bold">Theme · Backup · Deploy</h1>
        <p className="text-sm text-ink-500">Colours, logo, security, data backup and hosting instructions.</p>
      </div>

      <Panel title={<span className="flex items-center gap-2"><Palette className="h-4 w-4" /> Colours</span>} desc="Applied instantly across the whole site">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="label">Brand colour</span>
            <div className="flex gap-2">
              <input type="color" className="h-11 w-14 rounded-xl border border-ink-900/10" value={theme.brand} onChange={(e) => setTheme({ brand: e.target.value })} />
              <input className="field" value={theme.brand} onChange={(e) => setTheme({ brand: e.target.value })} />
            </div>
          </label>
          <label className="block">
            <span className="label">Accent colour</span>
            <div className="flex gap-2">
              <input type="color" className="h-11 w-14 rounded-xl border border-ink-900/10" value={theme.accent} onChange={(e) => setTheme({ accent: e.target.value })} />
              <input className="field" value={theme.accent} onChange={(e) => setTheme({ accent: e.target.value })} />
            </div>
          </label>
        </div>

        <div className="mt-5">
          <p className="label">Presets</p>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <button
                key={p.name}
                onClick={() => setTheme({ brand: p.brand, accent: p.accent })}
                className={cn('flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition',
                  theme.brand === p.brand ? 'border-brand-600 bg-brand-50 text-brand-800' : 'border-ink-900/10 hover:bg-ink-900/5')}
              >
                <span className="h-4 w-4 rounded-full" style={{ background: p.brand }} />
                <span className="h-4 w-4 rounded-full" style={{ background: p.accent }} />
                {p.name}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6 border-t border-ink-900/5 pt-5">
          <p className="label">Logo</p>
          <div className="flex flex-wrap items-center gap-3">
            {settings.logo ? (
              <img src={settings.logo} alt="" className="h-12 w-24 rounded-lg border border-ink-900/10 object-contain p-1" />
            ) : (
              <span className="grid h-12 w-24 place-items-center rounded-lg border border-dashed border-ink-900/15 text-xs text-ink-500">
                <ImageIcon className="h-4 w-4" />
              </span>
            )}
            <button onClick={() => logoRef.current?.click()} className="btn-ghost px-3.5 py-2 text-xs">Upload logo</button>
            {settings.logo && <button onClick={() => setSettings({ logo: '' })} className="btn-ghost px-3.5 py-2 text-xs text-red-600">Remove</button>}
            <input ref={logoRef} type="file" accept="image/*" className="hidden" onChange={onLogo} />
          </div>
          <p className="mt-2 text-xs text-ink-500">Transparent PNG or SVG works best. Under 1 MB.</p>
        </div>
      </Panel>

      <Panel
        title={<span className="flex items-center gap-2"><ShieldCheck className="h-4 w-4" /> Security</span>}
        desc="Who can sign in to this portal"
      >
        <p className="mb-3 rounded-xl bg-ink-900/[0.04] px-3 py-2 text-[11px] leading-relaxed text-ink-600">
          Roles are labels for now — every account can currently do everything in the portal.
          Permissions have not been wired up yet.
        </p>
        <div className="mb-5 grid gap-3 border-b border-ink-900/5 pb-5 sm:grid-cols-2">
          <SEL
            label="Sign out when idle"
            value={String(settings.sessionTimeoutMinutes ?? 30)}
            onChange={(v) => setSettings({ sessionTimeoutMinutes: Number(v) })}
            options={[
              { value: '0', label: 'Never' },
              { value: '15', label: 'After 15 minutes' },
              { value: '30', label: 'After 30 minutes' },
              { value: '60', label: 'After 1 hour' },
              { value: '120', label: 'After 2 hours' },
            ]}
            hint="Counts mouse and keyboard activity while the admin panel is open"
          />
          <p className="self-end text-xs leading-relaxed text-ink-500">
            On a shared office machine, an unattended panel should not stay signed in. This is a
            convenience guard, not a security boundary — see the note below.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-sm">
            <thead>
              <tr className="border-b border-ink-900/8 text-left text-[11px] uppercase tracking-wide text-ink-500">
                <th className="px-3 py-2 font-bold">Name</th>
                <th className="px-3 py-2 font-bold">Email</th>
                <th className="px-3 py-2 font-bold">Role</th>
                <th className="w-10 px-3 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-900/5">
              {(settings.adminUsers || []).map((u) => (
                <tr key={u.email}>
                  <td className="px-3 py-2 font-medium">
                    {u.name}
                    {u.email === currentUser?.email && <span className="ml-2 text-[11px] text-brand-700">(you)</span>}
                  </td>
                  <td className="px-3 py-2 text-ink-600">{u.email}</td>
                  <td className="px-3 py-2"><span className="chip">{u.role}</span></td>
                  <td className="px-3 py-2">
                    {(settings.adminUsers || []).length > 1 && (
                      <button
                        onClick={() => { removeAdminUser(u.email); toast(`${u.email} removed`) }}
                        aria-label={`Remove ${u.email}`}
                        className="grid h-8 w-8 place-items-center rounded-lg text-ink-400 transition hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-ink-900/8 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-ink-500">Add an account</p>
            <div className="mt-3 space-y-2">
              <TF label="Name" value={newUser.name} onChange={(v) => setNewUser((u) => ({ ...u, name: v }))} placeholder="Treasurer" />
              <TF label="Email" type="email" value={newUser.email} onChange={(v) => setNewUser((u) => ({ ...u, email: v }))} placeholder="name@ksochd.org" />
              <TF label="Password" type="password" value={newUser.password} onChange={(v) => setNewUser((u) => ({ ...u, password: v }))} />
              <div>
                <span className="label">Role</span>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser((u) => ({ ...u, role: e.target.value }))}
                  className="field mt-1"
                >
                  {['Admin', 'Editor', 'Viewer'].map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <button
                onClick={() => {
                  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(newUser.email.trim())) return toast('Enter a valid email', 'error')
                  if (newUser.password.length < 8) return toast('Use at least 8 characters', 'error')
                  if ((settings.adminUsers || []).some((u) => u.email === newUser.email.trim())) return toast('That email already has an account', 'error')
                  addAdminUser({ ...newUser, email: newUser.email.trim() })
                  setNewUser({ name: '', email: '', password: '', role: 'Editor' })
                  toast('Account added')
                }}
                className="btn-primary w-full px-4 py-2 text-xs"
              >
                <UserPlus className="mr-1.5 h-3.5 w-3.5" /> Add account
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-ink-900/8 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-ink-500">Change my password</p>
            <div className="mt-3 space-y-2">
              <TF label="Current password" type="password" value={pw.current} onChange={(v) => setPw((p) => ({ ...p, current: v }))} />
              <TF label="New password" type="password" value={pw.next} onChange={(v) => setPw((p) => ({ ...p, next: v }))} />
              <TF label="Confirm new password" type="password" value={pw.confirm} onChange={(v) => setPw((p) => ({ ...p, confirm: v }))} />
              <button
                onClick={() => {
                  if (pw.next.length < 8) return toast('Use at least 8 characters', 'error')
                  if (pw.next !== pw.confirm) return toast('New passwords do not match', 'error')
                  if (!changeOwnPassword(pw.current, pw.next)) return toast('Current password is wrong', 'error')
                  setPw({ current: '', next: '', confirm: '' })
                  toast('Password updated')
                }}
                className="btn-primary w-full px-4 py-2 text-xs"
              >
                <KeyRound className="mr-1.5 h-3.5 w-3.5" /> Update password
              </button>
            </div>
          </div>
        </div>

        <p className="mt-4 rounded-xl bg-amber-50 p-3.5 text-xs leading-relaxed text-amber-900">
          Accounts are checked in the browser, so this keeps casual visitors out — not a determined
          attacker, who can read them in devtools. Before going live, gate <code>/admin</code> behind
          your backend (set <strong>VITE_API_BASE_URL</strong> and authenticate server-side) or use
          host-level protection (Netlify site protection, Cloudflare Access). See
          <strong> DEPLOY.md → Securing the admin</strong>.
        </p>
      </Panel>

      <Panel
        title={<span className="flex items-center gap-2"><BellRing className="h-4 w-4" /> Notifications &amp; delivery</span>}
        desc="Where contact, volunteer and donation messages go when someone fills in a form"
      >
        <p className="mb-4 rounded-xl bg-ink-900/[0.04] px-3 py-2 text-[11px] leading-relaxed text-ink-600">
          A browser cannot send email by itself, and a mail API key in a static bundle would be
          public. So delivery is handed to a service: paste a URL that accepts a POST (Formspree,
          Make, n8n, a Supabase Edge Function, your own endpoint) and every new submission is
          forwarded to it. Messages are always kept in the Inbox as well, so a failed delivery
          never loses one.
        </p>
        <div className="grid gap-3">
          <TF
            label="Delivery URL (webhook)"
            value={notifications.webhookUrl}
            onChange={(v) => setNotif('webhookUrl', v)}
            placeholder="https://formspree.io/f/your-form-id"
            hint="Leave blank and nothing leaves the browser"
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <Toggle
              label="Forward new submissions"
              hint="Contact and volunteer enquiries"
              checked={notifications.notifyOnSubmission !== false}
              onChange={(v) => setNotif('notifyOnSubmission', v)}
            />
            <Toggle
              label="Forward donation intents"
              hint="Someone completed the donate form"
              checked={notifications.notifyOnDonation !== false}
              onChange={(v) => setNotif('notifyOnDonation', v)}
            />
          </div>
          <div className="flex flex-wrap items-center gap-2 border-t border-ink-900/5 pt-3">
            <Button size="sm" variant="outline" onClick={async () => {
              const res = await sendTestNotification(notifications.webhookUrl)
              if (res.ok) toast('Test delivered — check your inbox')
              else if (res.skipped) toast(res.skipped, 'error')
              else toast(`Could not deliver: ${res.error}`, 'error')
            }}>
              <Send className="h-3.5 w-3.5" /> Send a test
            </Button>
            <span className="text-xs text-ink-500">
              {notifications.webhookUrl ? 'Submissions will be forwarded as they arrive.' : 'Nothing is being forwarded yet.'}
            </span>
          </div>
        </div>
      </Panel>

      <Panel
        title={<span className="flex items-center gap-2"><Rocket className="h-4 w-4" /> Production mode</span>}
        desc="Turn this on when the site is live and carrying real money and real member data"
        actions={
          left.length === 0 ? (
            <Badge tone="green">Ready to go live</Badge>
          ) : (
            <Badge tone="amber">{left.length} blocking</Badge>
          )
        }
      >
        <Toggle
          label="Production mode"
          hint="Refuses to re-seed demo data and forces the default password to be changed"
          checked={production}
          onChange={(v) => {
            setSettings({ productionMode: v })
            toast(v ? 'Production mode is on' : 'Production mode is off')
          }}
        />

        <div className="mt-3 border-t border-ink-900/5 pt-3">
          <Toggle
            label="Show the demo-data banner"
            hint="The banner on the Overview tells whoever signs in that the figures are samples. It is never shown to visitors, and production mode hides it regardless of this setting."
            checked={settings.showDemoBadge !== false}
            onChange={(v) => {
              setSettings({ showDemoBadge: v })
              toast(v ? 'Demo banner shown' : 'Demo banner hidden')
            }}
          />
        </div>

        {production && (
          <ul className="mt-3 space-y-1 rounded-xl bg-ink-900/[0.04] px-3.5 py-3 text-xs text-ink-600">
            {productionRestrictions(settings).map((r) => (
              <li key={r} className="flex gap-2">
                <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" /> {r}
              </li>
            ))}
          </ul>
        )}

        <p className="mt-4 text-xs text-ink-500">
          Production mode is guard rails, not a lock. Accounts are still checked in the browser, so
          this keeps honest people honest — the real boundary is server-side auth, described in
          <strong> DEPLOY.md → Securing the admin</strong>.
        </p>

        <div className="mt-5 border-t border-ink-900/5 pt-4">
          <p className="label">Before you go live</p>
          <ul className="mt-2 space-y-1.5">
            {checklist.filter((i) => i.blocking).map((item) => (
              <li key={item.id} className="flex gap-2 text-sm">
                {item.done ? (
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                ) : (
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                )}
                <span>
                  <strong className={item.done ? 'text-ink-500 line-through' : ''}>{item.label}</strong>
                  {!item.done && (
                    <span className="block text-xs text-ink-500">
                      {item.why} <span className="text-ink-400">· {item.where}</span>
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>

          {warnings.length > 0 && (
            <>
              <p className="mt-4 text-xs font-bold uppercase tracking-wide text-ink-500">Worth doing, not blocking</p>
              <ul className="mt-2 space-y-1.5">
                {warnings.map((item) => (
                  <li key={item.id} className="flex gap-2 text-sm">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-ink-400" />
                    <span>
                      <strong>{item.label}</strong>
                      <span className="block text-xs text-ink-500">
                        {item.why} <span className="text-ink-400">· {item.where}</span>
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </Panel>

      <Panel
        title={<span className="flex items-center gap-2"><Hammer className="h-4 w-4" /> Maintenance mode</span>}
        desc="Show visitors a holding page while you work on the site"
        actions={maintenance.enabled ? <Badge tone="amber">Visitors see the holding page</Badge> : null}
      >
        <Toggle
          label="Maintenance mode"
          hint="Signed-in admins still see the real site, so you can check your own edits"
          checked={Boolean(maintenance.enabled)}
          onChange={(v) => {
            setMaintenance({ enabled: v })
            toast(v ? 'Visitors now see the holding page' : 'Site is public again')
          }}
        />
        <div className="mt-4 grid gap-3">
          <TF
            label="Heading"
            value={maintenance.heading}
            onChange={(v) => setMaintenance({ heading: v })}
            placeholder="We will be right back"
          />
          <TA
            label="Message"
            rows={3}
            value={maintenance.message}
            onChange={(v) => setMaintenance({ message: v })}
            placeholder="This site is being updated. Please check again shortly."
            hint="The organisation name, address, phone and email stay on the page either way."
          />
        </div>
        {maintenance.enabled && (
          <p className="mt-4 rounded-xl bg-amber-50 p-3.5 text-xs leading-relaxed text-amber-900">
            <strong>Live now.</strong> Nobody but a signed-in admin can see the site. Turn this off
            the moment you are done — it is easy to forget, and the site simply looks broken to
            everyone else.
          </p>
        )}
      </Panel>

      <Panel
        title={<span className="flex items-center gap-2"><BarChart3 className="h-4 w-4" /> Analytics</span>}
        desc="Optional. Counts visits so you can tell whether the donate page is working"
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <SEL
            label="Provider"
            value={analytics.provider || 'none'}
            onChange={(v) => setAnalytics({ provider: v })}
            options={[
              { value: 'none', label: 'None' },
              { value: 'ga4', label: 'Google Analytics 4' },
              { value: 'plausible', label: 'Plausible (privacy-first)' },
            ]}
          />
          {(analytics.provider === 'ga4' || analytics.provider === 'plausible') && (
            <TF
              label={analytics.provider === 'ga4' ? 'Measurement ID' : 'Site ID'}
              value={analytics.id}
              onChange={(v) => setAnalytics({ id: v })}
              placeholder={analytics.provider === 'ga4' ? 'G-XXXXXXXXXX' : 'your-domain.org'}
              hint={analytics.provider === 'ga4' ? 'Admin → Data streams in Google Analytics' : 'The domain registered with Plausible'}
            />
          )}
        </div>

        <p className="mt-4 rounded-xl bg-ink-900/[0.04] px-3.5 py-3 text-xs leading-relaxed text-ink-600">
          <strong>Nothing loads until the visitor agrees.</strong> A consent bar appears on their
          first visit, and {analytics.provider === 'plausible' ? 'the Plausible script' : 'the tracking tag'}
          {' '}is only added after they allow it. Declining is as easy as allowing, and leaves no
          third-party request on the page. A visitor can change their answer from
          <strong> Privacy choices</strong> in the footer.
        </p>

        <p className="mt-3 text-xs text-ink-500">
          Leave this blank and no analytics runs at all. If you would rather keep the ID out of the
          settings, set <code>VITE_ANALYTICS_ID</code> instead — the setting wins when both exist.
        </p>
      </Panel>

      <Panel
        title={<span className="flex items-center gap-2"><ScrollText className="h-4 w-4" /> Activity</span>}
        desc="Who changed what, newest first. Kept for the last 500 entries — nothing here can be deleted from the panel."
        actions={audit.length ? (
          <Button size="sm" variant="outline" onClick={() => {
            downloadFile(`kso-activity-${new Date().toISOString().slice(0, 10)}.csv`,
              toCSV(audit.map((a) => ({ When: new Date(a.at).toLocaleString('en-IN'), Who: a.actor, Action: a.action, What: a.target, Detail: a.detail, Times: a.count || 1 })),
                ['When', 'Who', 'Action', 'What', 'Detail', 'Times']), 'text/csv')
            toast('Activity exported')
          }}>
            <Download className="h-3.5 w-3.5" /> Export
          </Button>
        ) : null}
      >
        {audit.length === 0 ? (
          <p className="py-6 text-center text-sm text-ink-500">
            Nothing recorded yet. Every edit, sign-in and deletion is logged from here on.
          </p>
        ) : (
          <div className="max-h-72 overflow-y-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-ink-900/8 text-left text-[11px] uppercase tracking-wide text-ink-500">
                  <th className="px-3 py-2 font-bold">When</th>
                  <th className="px-3 py-2 font-bold">Who</th>
                  <th className="px-3 py-2 font-bold">Action</th>
                  <th className="px-3 py-2 font-bold">What</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-900/5">
                {audit.slice(0, 40).map((a) => (
                  <tr key={a.id}>
                    <td className="whitespace-nowrap px-3 py-2 text-xs text-ink-500">
                      {new Date(a.at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-3 py-2 text-xs text-ink-600">{a.actor}</td>
                    <td className="px-3 py-2">
                      {a.action} {(a.count || 1) > 1 && <Badge tone="slate">{a.count}×</Badge>}
                    </td>
                    <td className="px-3 py-2 text-xs text-ink-500">
                      {a.target}{a.detail ? ` · ${a.detail}` : ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Panel
        title={<span className="flex items-center gap-2"><Stamp className="h-4 w-4" /> Compliance &amp; signatory</span>}
        desc="Printed on 80G receipts and utilisation certificates. Anything left blank prints as a bracketed placeholder, so a document can never look finished while a statutory number is missing."
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <TF label="80G registration number" value={compliance.g80No} onChange={(v) => setCompliance('g80No', v)} placeholder="e.g. AAATK0000KF2021" error={complianceErrors.g80No} />
          <div className="grid grid-cols-2 gap-2">
            <TF label="80G valid from" type="date" value={compliance.g80ValidFrom} onChange={(v) => setCompliance('g80ValidFrom', v)} />
            <TF label="80G valid to" type="date" value={compliance.g80ValidUpto} onChange={(v) => setCompliance('g80ValidUpto', v)} error={complianceErrors.g80ValidUpto} />
          </div>
          <TF label="Organisation PAN" value={compliance.pan} onChange={(v) => setCompliance('pan', v)} placeholder="ABCDE1234F" error={complianceErrors.pan} />
          <TF label="Registration number" value={compliance.regdNo} onChange={(v) => setCompliance('regdNo', v)} placeholder={content.org?.registration || 'Regd. No. …'} />
          <TF label="Registered address" value={compliance.address} onChange={(v) => setCompliance('address', v)} placeholder={content.org?.address || 'Address printed in the receipt header'} />
          <TF label="Place of issue" value={compliance.place} onChange={(v) => setCompliance('place', v)} placeholder={content.org?.city || 'Chandigarh'} />
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <TF label="Authorised signatory" value={compliance.signatoryName} onChange={(v) => setCompliance('signatoryName', v)} placeholder="Name printed on the receipt" />
          <TF label="Designation" value={compliance.signatoryDesignation} onChange={(v) => setCompliance('signatoryDesignation', v)} placeholder="e.g. Honorary Secretary" />
        </div>
        {Object.keys(complianceErrors).length > 0 && (
          <p className="mt-4 rounded-xl bg-red-50 p-3.5 text-xs leading-relaxed text-red-800">
            <strong>Wrong format:</strong> {Object.entries(complianceErrors).map(([k, v]) => `${k} — ${v}`).join('; ')}.
            These print on receipts exactly as typed.
          </p>
        )}
        {missing.length > 0 && (
          <p className="mt-4 rounded-xl bg-amber-50 p-3.5 text-xs leading-relaxed text-amber-900">
            <strong>Still to fill in:</strong> {missing.map((m) => m.label).join(', ')}. Until you do, the
            receipts and certificates print these as bracketed placeholders.
          </p>
        )}
      </Panel>

      <Panel title={<span className="flex items-center gap-2"><Download className="h-4 w-4" /> Backup</span>} desc="Everything you have typed, in one JSON file">
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            ['Content', Object.keys(content).length + ' sections'],
            ['Transactions', 'managed in Finance → Accounts'],
            ['Members & inbox', `${memberships.length} / ${submissions.length}`],
          ].map(([k, v]) => (
            <div key={k} className="rounded-xl bg-ink-900/[0.03] p-3.5">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">{k}</p>
              <p className="mt-0.5 text-sm font-semibold">{v}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button onClick={() => { downloadFile(`kso-backup-${new Date().toISOString().slice(0, 10)}.json`, exportAll()); toast('Backup downloaded') }} className="btn-primary px-4 py-2 text-xs">
            <Download className="h-3.5 w-3.5" /> Export JSON
          </button>
          <button onClick={() => fileRef.current?.click()} className="btn-ghost px-4 py-2 text-xs">
            <Upload className="h-3.5 w-3.5" /> Import JSON
          </button>
          <input ref={fileRef} type="file" accept="application/json" className="hidden" onChange={onImport} />
          <button
            onClick={() => setConfirmReset(true)}
            className="btn-ghost px-4 py-2 text-xs text-red-600"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Reset to defaults
          </button>
        </div>
        <p className="mt-3 text-xs text-ink-500">
          Backups are per-browser. If two people edit on different devices, export from one and import on the other — or
          connect a backend so everyone shares one source of truth.
        </p>
      </Panel>

      <Panel title={<span className="flex items-center gap-2"><Globe className="h-4 w-4" /> Hosting & deployment</span>} desc="This is a static React app — it runs anywhere, for free">
        <div className="space-y-3">
          {commands.map(([label, cmd]) => (
            <div key={label} className="rounded-xl border border-ink-900/10">
              <div className="flex items-center justify-between gap-2 border-b border-ink-900/5 px-3.5 py-2">
                <p className="text-xs font-bold uppercase tracking-wide text-ink-500">{label}</p>
                <button onClick={() => copy(cmd, label)} className="flex items-center gap-1 text-xs font-semibold text-brand-700 hover:underline">
                  {copied === label ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />} {copied === label ? 'Copied' : 'Copy'}
                </button>
              </div>
              <pre className="overflow-x-auto px-3.5 py-2.5 text-[12px] leading-relaxed text-ink-800">{cmd}</pre>
            </div>
          ))}
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <a href="https://vercel.com/new" target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-xl border border-ink-900/10 p-3.5 text-sm font-semibold hover:bg-ink-900/[0.03]">
            <Globe className="h-4 w-4 text-brand-700" /> Deploy to Vercel <ExternalLink className="h-3.5 w-3.5" />
          </a>
          <a href="https://app.netlify.com/drop" target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-xl border border-ink-900/10 p-3.5 text-sm font-semibold hover:bg-ink-900/[0.03]">
            <Server className="h-4 w-4 text-brand-700" /> Drag &amp; drop to Netlify <ExternalLink className="h-3.5 w-3.5" />
          </a>
          <a href="https://pages.github.com/" target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-xl border border-ink-900/10 p-3.5 text-sm font-semibold hover:bg-ink-900/[0.03]">
            <Github className="h-4 w-4 text-brand-700" /> GitHub Pages docs <ExternalLink className="h-3.5 w-3.5" />
          </a>
          <div className="flex items-center gap-2 rounded-xl border border-ink-900/10 p-3.5 text-sm">
            <Terminal className="h-4 w-4 text-brand-700" />
            <span>Full guide: <strong>DEPLOY.md</strong> in the project folder</span>
          </div>
        </div>

        <div className="mt-5 rounded-xl bg-brand-50/70 p-4 text-xs leading-relaxed text-ink-700">
          <p className="font-semibold text-brand-900">Recommended path for a small NGO</p>
          <p className="mt-1">
            Push the folder to GitHub, connect it to <strong>Vercel</strong> (free). Every push auto-deploys. Add your
            custom domain in Vercel → Domains (free SSL included). Put images behind CloudFront later if traffic grows.
            Everything else — content, AI, donations — is already editable from this panel.
          </p>
        </div>
      </Panel>
    </div>
  )
}

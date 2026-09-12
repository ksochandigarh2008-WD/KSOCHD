import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  LayoutDashboard, PencilLine, FolderTree, BookOpen, TrendingUp, Users, Wallet, Receipt,
  Inbox, Sparkles, Cog, Landmark, FileSpreadsheet, Command as CommandIcon, Lock, LogOut,
  ArrowLeft, ExternalLink,
} from 'lucide-react'
import { useSite } from '../../store/useSite'
import { useToast } from '../../components/ui'
import SideNav from '../../components/admin/SideNav'
import LoginScreen from '../../components/admin/LoginScreen'
import ForcedPasswordChange from '../../components/admin/ForcedPasswordChange'
import CommandPalette from '../../components/admin/CommandPalette'
import { TooltipProvider } from '../../components/admin/ui'
import { useLocalStorage } from '../../lib/useLocalStorage'
import { renewalState } from '../../lib/finance'
import { isSupabase } from '../../lib/supabase'
import { useIdleTimeout } from '../../lib/useIdleTimeout'

import OverviewTab from './OverviewTab'
import SiteContentTab from './SiteContentTab'
import CollectionsTab from './CollectionsTab'
import AboutTab from './AboutTab'
import ImpactTab from './ImpactTab'
import MembershipTab from './membership/MembershipTab'
import FinanceTab from './finance/FinanceTab'
import AccountingTab from './AccountingTab'
import ReportsTab from './ReportsTab'
import LedgerTab from './LedgerTab'
import InboxTab from './InboxTab'
import AiTab from './AiTab'
import SystemTab from './SystemTab'

/**
 * Admin information architecture — grouped so the two management systems read as
 * systems, not as two more items in a flat list of thirteen.
 */
const GROUPS = [
  {
    id: 'overview',
    label: 'Overview',
    items: [{ id: 'overview', label: 'Overview', short: 'Overview', icon: LayoutDashboard, Comp: OverviewTab }],
  },
  {
    id: 'content',
    label: 'Content',
    items: [
      { id: 'content', label: 'Site content', short: 'Content', icon: PencilLine, Comp: SiteContentTab },
      { id: 'collections', label: 'Programmes · Events · Stories', short: 'Programmes', icon: FolderTree, Comp: CollectionsTab },
      { id: 'about', label: 'About · People · Gallery', short: 'About', icon: BookOpen, Comp: AboutTab },
      { id: 'impact', label: 'Impact & reports', short: 'Impact', icon: TrendingUp, Comp: ImpactTab },
    ],
  },
  {
    id: 'people',
    label: 'People & money',
    items: [
      { id: 'members', label: 'Membership', short: 'Members', icon: Users, Comp: MembershipTab, badge: 'renewals', badgeTone: 'amber' },
      { id: 'finance', label: 'Finance', short: 'Finance', icon: Wallet, Comp: FinanceTab, badge: 'pending', badgeTone: 'amber' },
      { id: 'accounts', label: 'Accounts — books & vouchers', short: 'Accounts', icon: Landmark, Comp: AccountingTab },
      { id: 'reports', label: 'Financial reports', short: 'Reports', icon: FileSpreadsheet, Comp: ReportsTab },
      { id: 'ledger', label: 'Quick entry', short: 'Quick entry', icon: Receipt, Comp: LedgerTab },
    ],
  },
  {
    id: 'engage',
    label: 'Engage',
    items: [
      { id: 'inbox', label: 'Inbox', short: 'Inbox', icon: Inbox, Comp: InboxTab, badge: 'unread', badgeTone: 'red' },
      { id: 'ai', label: 'AI assistant', short: 'AI', icon: Sparkles, Comp: AiTab, badge: 'aiMode' },
    ],
  },
  {
    id: 'system',
    label: 'System',
    items: [{ id: 'system', label: 'Theme · Backup · Deploy', short: 'System', icon: Cog, Comp: SystemTab }],
  },
]

export const ADMIN_GROUPS = GROUPS

const ALL_ITEMS = GROUPS.flatMap((g) => g.items)

export default function Admin() {
  const authed = useSite((s) => s.authed)
  const mustChangePassword = useSite((s) => s.mustChangePassword)
  const logout = useSite((s) => s.logout)
  const settings = useSite((s) => s.settings)
  const content = useSite((s) => s.content)
  const submissions = useSite((s) => s.submissions)
  const memberships = useSite((s) => s.memberships)
  const transactions = useSite((s) => s.transactions)
  const ai = useSite((s) => s.ai)
  const toast = useToast()

  const [tab, setTab] = useState('overview')
  const [palette, setPalette] = useState(false)

  // Nav preferences are UI state, so they live outside the site store.
  const [collapsed, setCollapsed] = useLocalStorage('kso-admin-nav-collapsed', false)
  const [closedGroups, setClosedGroups] = useLocalStorage('kso-admin-nav-groups', {})

  const toggleGroup = (id, close) =>
    setClosedGroups((prev) => {
      const next = { ...prev }
      if (close) next[id] = true
      else delete next[id]
      return next
    })

  /**
   * An unattended admin panel on a shared office machine is the realistic risk.
   * The setting lives in Admin → System → Security; 0 turns this off.
   */
  const sessionMinutes = Number(settings?.sessionTimeoutMinutes ?? 30)
  useIdleTimeout(sessionMinutes, () => {
    logout()
    toast(`Signed out after ${sessionMinutes} minute${sessionMinutes === 1 ? '' : 's'} without activity`, 'info')
  })

  // Live counts so the nav shows where attention is needed.
  const counts = useMemo(() => {
    const unread = (submissions || []).filter((s) => s.status === 'new').length
    const renewals = (memberships || []).filter((m) => ['amber', 'red'].includes(renewalState(m).tone)).length
    const pending = (transactions || []).filter((t) => t.status === 'Pending').length
    const aiLive = ai.provider !== 'offline' && Boolean(ai.apiKey)
    return { unread, renewals, pending, aiMode: aiLive ? 'Live' : null }
  }, [submissions, memberships, transactions, ai])

  // ⌘K actions reach into the tabs through a tiny event bus, so the tabs stay
  // self-contained and the palette never has to hold their state.
  const fire = (name) => window.dispatchEvent(new CustomEvent(name))
  const jump = (id, event) => {
    const owner = GROUPS.find((g) => g.items.some((i) => i.id === id))
    if (owner) toggleGroup(owner.id, false)
    setTab(id)
    if (event) setTimeout(() => fire(event), 80)
  }
  const paletteActions = {
    addMember: () => jump('members', 'kso:add-member'),
    recordTransaction: () => jump('finance', 'kso:add-transaction'),
    exportMembers: () => jump('members', 'kso:export-members'),
    exportFinance: () => jump('finance', 'kso:export-finance'),
    exportBackup: () => jump('system', 'kso:export-backup'),
  }

  const Active = ALL_ITEMS.find((t) => t.id === tab)?.Comp || OverviewTab

  if (!authed) return <LoginScreen />
  // Production mode will not let a session continue on the published default password.
  if (mustChangePassword) return <ForcedPasswordChange />

  return (
    <TooltipProvider delayDuration={200}>
      <div className="min-h-screen bg-ink-900/[0.03]">
        {/* top bar */}
        <header className="sticky top-0 z-40 border-b border-ink-900/5 bg-white/90 backdrop-blur">
          <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-4 px-4 py-3">
            <div className="flex items-center gap-3">
              {settings.logo ? (
                <img src={settings.logo} alt="" className="h-8 w-auto rounded-lg object-contain" />
              ) : (
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-700 text-xs font-bold text-white">
                  {content.org.shortName.slice(0, 3)}
                </span>
              )}
              <div>
                <p className="text-sm font-bold leading-tight">{content.org.shortName} Control Panel</p>
                <p className="text-[11px] text-ink-500">
                  {isSupabase ? 'Supabase connected' : 'Local storage'} · {counts.unread || 0} unread
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setPalette(true)} className="btn-ghost px-3 py-2 text-xs">
                <CommandIcon className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Search</span>
                <kbd className="ml-1 hidden rounded border border-ink-900/15 bg-white px-1 text-[10px] font-semibold sm:inline">⌘K</kbd>
              </button>
              <Link to="/" target="_blank" className="btn-ghost px-3 py-2 text-xs">
                <ExternalLink className="h-3.5 w-3.5" /> View site
              </Link>
              <button onClick={logout} className="btn-ghost px-3 py-2 text-xs">
                <LogOut className="h-3.5 w-3.5" /> Lock
              </button>
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-[1400px] px-4 py-6">
          {/* mobile: grouped chip strip */}
          <div className="mb-4 md:hidden">
            <SideNav
              variant="mobile"
              groups={GROUPS}
              active={tab}
              onSelect={setTab}
              counts={counts}
              collapsed={false}
              onLock={logout}
              storageLabel={isSupabase ? 'Supabase' : 'Local'}
            />
          </div>

          {/* desktop: rail + content */}
          <div
            className="grid gap-6 md:[grid-template-columns:var(--nav-w)_minmax(0,1fr)]"
            style={{ '--nav-w': collapsed ? '68px' : '236px' }}
          >
            <aside className="sticky top-20 hidden h-fit md:block">
              <SideNav
                variant="desktop"
                groups={GROUPS}
                active={tab}
                onSelect={setTab}
                counts={counts}
                collapsed={collapsed}
                onToggleCollapsed={() => setCollapsed((v) => !v)}
                closedGroups={closedGroups}
                onToggleGroup={toggleGroup}
                onLock={logout}
                storageLabel={isSupabase ? 'Supabase' : 'Local'}
              />
            </aside>

            <main className="min-w-0">
              <Active goTo={(id) => jump(id)} />
            </main>
          </div>
        </div>

        <CommandPalette open={palette} onOpenChange={setPalette} goTo={(id) => jump(id)} actions={paletteActions} />
      </div>
    </TooltipProvider>
  )
}

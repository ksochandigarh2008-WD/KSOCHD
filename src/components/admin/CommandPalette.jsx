import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Command } from 'cmdk'
import { Dialog, DialogContent } from './ui'
import {
  LayoutDashboard, PencilLine, FolderTree, BookOpen, TrendingUp, Users, Wallet, Receipt,
  Inbox, Sparkles, Cog, Plus, Download, Home,
} from 'lucide-react'

/**
 * ⌘K / Ctrl+K command palette for the admin panel.
 * Mirrors the side navigation's groups so the two stay consistent.
 */
export default function CommandPalette({ open, onOpenChange, goTo, actions = [] }) {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        onOpenChange(!open)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onOpenChange])

  useEffect(() => {
    if (!open) setSearch('')
  }, [open])

  const run = (fn) => {
    onOpenChange(false)
    fn?.()
  }

  const sections = [
    {
      heading: 'Overview',
      items: [{ label: 'Overview', icon: LayoutDashboard, run: () => goTo('overview') }],
    },
    {
      heading: 'Content',
      items: [
        { label: 'Site content', icon: PencilLine, run: () => goTo('content') },
        { label: 'Programmes · Events · Stories', icon: FolderTree, run: () => goTo('collections') },
        { label: 'About · People · Gallery', icon: BookOpen, run: () => goTo('about') },
        { label: 'Impact & reports', icon: TrendingUp, run: () => goTo('impact') },
      ],
    },
    {
      heading: 'People & money',
      items: [
        { label: 'Membership management', icon: Users, run: () => goTo('members') },
        { label: 'Financial management', icon: Wallet, run: () => goTo('finance') },
        { label: 'Quick entry', icon: Receipt, run: () => goTo('ledger') },
      ],
    },
    {
      heading: 'Engage',
      items: [
        { label: 'Inbox', icon: Inbox, run: () => goTo('inbox') },
        { label: 'AI assistant', icon: Sparkles, run: () => goTo('ai') },
      ],
    },
    {
      heading: 'System',
      items: [{ label: 'Theme · Backup · Deploy', icon: Cog, run: () => goTo('system') }],
    },
    {
      heading: 'Actions',
      items: [
        { label: 'Add a member', icon: Plus, run: () => actions.addMember?.() },
        { label: 'Record a transaction', icon: Plus, run: () => actions.recordTransaction?.() },
        { label: 'Export members (CSV)', icon: Download, run: () => actions.exportMembers?.() },
        { label: 'Export finance (CSV)', icon: Download, run: () => actions.exportFinance?.() },
        { label: 'Export site backup (JSON)', icon: Download, run: () => actions.exportBackup?.() },
        { label: 'Open public website', icon: Home, run: () => navigate('/') },
      ],
    },
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="top-[20%] translate-y-0 p-0" style={{ '--dialog-w': '34rem' }}>
        <Command className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-bold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wide [&_[cmdk-group-heading]]:text-ink-500">
          <Command.Input
            value={search}
            onValueChange={setSearch}
            placeholder="Search sections and actions…"
            className="w-full border-b border-ink-900/8 px-4 py-3.5 text-sm outline-none placeholder:text-ink-500/60"
          />
          <Command.List className="max-h-[52vh] overflow-y-auto p-1.5">
            <Command.Empty className="px-3 py-8 text-center text-sm text-ink-500">No matches.</Command.Empty>
            {sections.map((section) => (
              <Command.Group key={section.heading} heading={section.heading}>
                {section.items.map((item) => (
                  <Command.Item
                    key={item.label}
                    value={item.label}
                    onSelect={() => run(item.run)}
                    className="flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm data-[selected=true]:bg-brand-50 data-[selected=true]:text-brand-900"
                  >
                    <item.icon className="h-4 w-4 shrink-0 text-ink-500" />
                    {item.label}
                  </Command.Item>
                ))}
              </Command.Group>
            ))}
          </Command.List>
          <div className="flex items-center justify-between border-t border-ink-900/8 bg-ink-900/[0.02] px-4 py-2.5 text-[11px] text-ink-500">
            <span>↑↓ to navigate · ↵ to select · esc to close</span>
            <span className="rounded border border-ink-900/10 bg-white px-1.5 py-0.5 font-semibold">⌘K</span>
          </div>
        </Command>
      </DialogContent>
    </Dialog>
  )
}

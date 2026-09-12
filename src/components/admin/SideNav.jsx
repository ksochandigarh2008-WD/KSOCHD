import { useEffect, useRef } from 'react'
import { ChevronDown, PanelLeftClose, PanelLeftOpen, Lock } from 'lucide-react'
import { Tooltip, Badge } from './ui'
import { cn } from '../../lib/cn'

/**
 * Admin side navigation.
 *
 * Desktop : grouped, collapsible rail that can shrink to icons only.
 * Mobile  : a grouped, horizontally scrollable chip strip that auto-scrolls
 *           the active item into view.
 *
 * Badges are live counts passed in from the store, so the nav tells you where
 * attention is needed without opening each tab.
 */
export default function SideNav({
  groups,
  active,
  onSelect,
  counts = {},
  collapsed,
  onToggleCollapsed,
  closedGroups = {},
  onToggleGroup,
  onLock,
  storageLabel = 'Local',
  variant = 'desktop',
}) {
  const stripRef = useRef(null)

  // Auto-expand the group that owns the active tab
  useEffect(() => {
    const owner = groups.find((g) => g.items.some((i) => i.id === active))
    if (owner && closedGroups[owner.id]) onToggleGroup?.(owner.id, false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active])

  // Keep the active chip visible on mobile
  useEffect(() => {
    const el = stripRef.current?.querySelector('[data-active="true"]')
    el?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
  }, [active])

  const renderBadge = (item, compact = false) => {
    const value = counts[item.badge]
    if (!value) return null
    const tone = item.badgeTone || 'brand'
    if (compact) {
      return (
        <span
          className={cn(
            'absolute right-1.5 top-1.5 h-2 w-2 rounded-full ring-2 ring-white',
            tone === 'red' ? 'bg-red-500' : tone === 'amber' ? 'bg-amber-500' : 'bg-brand-500',
          )}
        />
      )
    }
    return (
      <Badge tone={tone} className="ml-auto px-1.5 py-0 text-[10px]">
        {value > 99 ? '99+' : value}
      </Badge>
    )
  }

  /* ------------------------------- mobile ------------------------------- */
  const MobileStrip = () => (
    <div ref={stripRef} className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-1 no-scrollbar md:hidden">
      {groups.map((group) => (
        <div key={group.id} className="flex shrink-0 items-center gap-1.5">
          <span className="text-[10px] font-bold uppercase tracking-wide text-ink-400">{group.label}</span>
          {group.items.map((item) => {
            const isActive = item.id === active
            return (
              <button
                key={item.id}
                data-active={isActive}
                onClick={() => onSelect(item.id)}
                className={cn(
                  'flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-semibold transition',
                  isActive ? 'bg-brand-700 text-white' : 'border border-ink-900/10 bg-white text-ink-700',
                )}
              >
                <item.icon className="h-3.5 w-3.5" />
                {item.short || item.label}
                {counts[item.badge] ? (
                  <span className={cn(
                    'rounded-full px-1.5 text-[10px] font-bold',
                    isActive ? 'bg-white/25' : item.badgeTone === 'red' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700',
                  )}>
                    {counts[item.badge]}
                  </span>
                ) : null}
              </button>
            )
          })}
        </div>
      ))}
    </div>
  )

  /* ------------------------------- desktop ------------------------------ */
  const DesktopRail = () => (
    <nav
      className={cn(
        'hidden rounded-2xl border border-ink-900/5 bg-white p-2 md:block',
        collapsed ? 'w-[68px]' : 'w-full',
      )}
      aria-label="Admin sections"
    >
      {/* header + collapse toggle */}
      <div className={cn('mb-2 flex items-center', collapsed ? 'justify-center' : 'justify-between px-2')}>
        {!collapsed && (
          <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-ink-400">Control panel</span>
        )}
        <Tooltip content={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} side="right">
          <button
            onClick={onToggleCollapsed}
            className="rounded-lg p-1.5 text-ink-500 transition hover:bg-ink-900/5"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </button>
        </Tooltip>
      </div>

      <div className="space-y-3">
        {groups.map((group) => {
          const isClosed = collapsed ? false : Boolean(closedGroups[group.id])
          const hasActive = group.items.some((i) => i.id === active)
          return (
            <div key={group.id}>
              {collapsed ? (
                <div className="mx-2 my-2 h-px bg-ink-900/8" />
              ) : (
                <button
                  onClick={() => onToggleGroup?.(group.id, !isClosed)}
                  className="mb-1 flex w-full items-center gap-1.5 rounded-lg px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-ink-400 transition hover:text-ink-600"
                  aria-expanded={!isClosed}
                >
                  {group.label}
                  <ChevronDown className={cn('ml-auto h-3 w-3 transition-transform', isClosed && '-rotate-90')} />
                </button>
              )}

              {!isClosed && (
                <div className="space-y-0.5">
                  {group.items.map((item) => {
                    const isActive = item.id === active
                    const button = (
                      <button
                        key={item.id}
                        onClick={() => onSelect(item.id)}
                        aria-label={item.label}
                        title={collapsed ? item.label : undefined}
                        data-nav-item={item.id}
                        className={cn(
                          'relative flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-[13px] font-semibold transition',
                          collapsed && 'justify-center px-0',
                          isActive
                            ? 'bg-brand-700 text-white shadow-sm'
                            : hasActive && collapsed
                              ? 'text-ink-900 hover:bg-ink-900/5'
                              : 'text-ink-700 hover:bg-ink-900/5',
                        )}
                        aria-current={isActive ? 'page' : undefined}
                      >
                        <item.icon className={cn('h-4 w-4 shrink-0', isActive ? 'text-white' : 'text-ink-500')} />
                        {!collapsed && <span className="truncate">{item.label}</span>}
                        {!collapsed && renderBadge(item)}
                        {collapsed && renderBadge(item, true)}
                      </button>
                    )
                    return collapsed ? (
                      <Tooltip key={item.id} content={item.label} side="right">
                        {button}
                      </Tooltip>
                    ) : (
                      button
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* footer */}
      <div className={cn('mt-4 border-t border-ink-900/8 pt-3', collapsed && 'flex flex-col items-center gap-2')}>
        {collapsed ? (
          <>
            <Tooltip content={`Storage: ${storageLabel}`} side="right">
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-ink-900/5 text-[10px] font-bold text-ink-500">
                {storageLabel === 'Supabase' ? 'DB' : 'LS'}
              </span>
            </Tooltip>
            <Tooltip content="Lock the panel" side="right">
              <button onClick={onLock} className="rounded-lg p-1.5 text-ink-500 hover:bg-ink-900/5" aria-label="Lock">
                <Lock className="h-4 w-4" />
              </button>
            </Tooltip>
          </>
        ) : (
          <div className="space-y-2 px-2">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-ink-500">Storage</span>
              <span className="flex items-center gap-1.5 font-semibold text-ink-700">
                <span className={cn('h-1.5 w-1.5 rounded-full', storageLabel === 'Supabase' ? 'bg-emerald-500' : 'bg-amber-500')} />
                {storageLabel}
              </span>
            </div>
            <button
              onClick={onLock}
              className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-ink-900/10 py-1.5 text-[11px] font-semibold text-ink-600 transition hover:bg-ink-900/5"
            >
              <Lock className="h-3.5 w-3.5" /> Lock panel
            </button>
          </div>
        )}
      </div>
    </nav>
  )

  return variant === 'mobile' ? <MobileStrip /> : <DesktopRail />
}

import React from 'react'
import { renderToString } from 'react-dom/server'
import { StaticRouter } from 'react-router-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from '../src/App'
import { ToastProvider } from '../src/components/ui'
import { TooltipProvider } from '../src/components/admin/ui'
import { useSite } from '../src/store/useSite'

import OverviewTab from '../src/pages/admin/OverviewTab'
import SiteContentTab from '../src/pages/admin/SiteContentTab'
import CollectionsTab from '../src/pages/admin/CollectionsTab'
import AboutTab from '../src/pages/admin/AboutTab'
import ImpactTab from '../src/pages/admin/ImpactTab'
import MembershipTab from '../src/pages/admin/membership/MembershipTab'
import FinanceTab from '../src/pages/admin/finance/FinanceTab'
import AccountingTab from '../src/pages/admin/AccountingTab'
import ReportsTab from '../src/pages/admin/ReportsTab'
import LedgerTab from '../src/pages/admin/LedgerTab'
import InboxTab from '../src/pages/admin/InboxTab'
import AiTab from '../src/pages/admin/AiTab'
import SystemTab from '../src/pages/admin/SystemTab'

useSite.setState({ authed: true })

export function renderPublic(path) {
  return renderToString(React.createElement(StaticRouter, { location: path },
    React.createElement(ToastProvider, null, React.createElement(App))))
}

const tabs = [
  ['Overview', OverviewTab], ['SiteContent', SiteContentTab], ['Collections', CollectionsTab],
  ['About', AboutTab], ['Impact', ImpactTab], ['Membership', MembershipTab], ['Finance', FinanceTab],
  ['Accounts', AccountingTab], ['Reports', ReportsTab],
  ['QuickLedger', LedgerTab], ['Inbox', InboxTab], ['AI', AiTab], ['System', SystemTab],
]

import MaintenanceScreen from '../src/components/MaintenanceScreen'
import ForcedPasswordChange from '../src/components/admin/ForcedPasswordChange'

import Home from '../src/pages/Home'
import About from '../src/pages/About'
import Programs from '../src/pages/Programs'
import Impact from '../src/pages/Impact'
import Events from '../src/pages/Events'
import Gallery from '../src/pages/Gallery'
import Stories from '../src/pages/Stories'
import Volunteer from '../src/pages/Volunteer'
import Donate from '../src/pages/Donate'
import Contact from '../src/pages/Contact'
import NotFound from '../src/pages/NotFound'

export function renderTabs() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return tabs.map(([name, Comp]) => {
    try {
      const html = renderToString(
        React.createElement(MemoryRouter, null,
          React.createElement(QueryClientProvider, { client: qc },
            React.createElement(ToastProvider, null,
              React.createElement(TooltipProvider, null, React.createElement(Comp, { goTo: () => {} }))))))
      return [name, html.length > 300 ? 'PASS' : 'WARN', html.length]
    } catch (err) { return [name, 'FAIL', err.message] }
  })
}
export function renderPages() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const pages = [
    ['Home', Home], ['About', About], ['Programs', Programs], ['Impact', Impact],
    ['Events', Events], ['Gallery', Gallery], ['Stories', Stories], ['Volunteer', Volunteer],
    ['Donate', Donate], ['Contact', Contact], ['NotFound', NotFound],
  ]
  return pages.map(([name, Comp]) => {
    try {
      const html = renderToString(
        React.createElement(MemoryRouter, null,
          React.createElement(QueryClientProvider, { client: qc },
            React.createElement(ToastProvider, null,
              React.createElement(TooltipProvider, null, React.createElement(Comp, {}))))))
      return [name, html.length > 300 ? 'PASS' : 'WARN', html.length]
    } catch (err) { return [name, 'FAIL', err.message] }
  })
}

export function renderScreens() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const screens = [
    ['maintenance holding page', MaintenanceScreen],
    ['forced password change', ForcedPasswordChange],
  ]
  return screens.map(([name, Comp]) => {
    try {
      const html = renderToString(
        React.createElement(MemoryRouter, null,
          React.createElement(QueryClientProvider, { client: qc },
            React.createElement(ToastProvider, null,
              React.createElement(TooltipProvider, null, React.createElement(Comp, {}))))))
      return [name, html.length > 300 ? 'PASS' : 'WARN', html.length]
    } catch (err) { return [name, 'FAIL', err.message] }
  })
}
export { useSite } from '../src/store/useSite'
export * as seed from '../src/data/seedData'
export * as acc from '../src/data/accounts'
export * as migrations from '../src/store/migrations'
export * as schemas from '../src/pages/admin/schemas'
export * as notifications from '../src/lib/notifications'
export * as production from '../src/lib/production'
export * as books from '../src/lib/accounting'
export * as fin from '../src/lib/finance'
export * as documents from '../src/lib/documents'
export * as jspdf from 'jspdf'
export { defaultContent } from '../src/data/defaultContent'

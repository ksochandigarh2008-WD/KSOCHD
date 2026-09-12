/* Temporary client-render harness: mounts the real Admin in jsdom. */
import React from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ToastProvider } from '../src/components/ui'
import { TooltipProvider } from '../src/components/admin/ui'
import { useSite } from '../src/store/useSite'
import Admin from '../src/pages/admin/Admin'
import App from '../src/App'
import db from '../src/lib/db'
import * as seedData from '../src/data/seedData'

const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })

/** Mount a public route so form flows can be exercised end to end. */
export function mountPublic(container, path) {
  const root = createRoot(container)
  root.render(
    React.createElement(MemoryRouter, { initialEntries: [path] },
      React.createElement(QueryClientProvider, { client: qc },
        React.createElement(ToastProvider, null,
          React.createElement(TooltipProvider, null, React.createElement(App))))),
  )
  return root
}

export function mount(container) {
  const root = createRoot(container)
  root.render(
    React.createElement(MemoryRouter, null,
      React.createElement(QueryClientProvider, { client: qc },
        React.createElement(ToastProvider, null,
          React.createElement(TooltipProvider, null, React.createElement(Admin))))),
  )
  return root
}
export { useSite }
export { db }
export { seedData as seed }
export { formatCurrency } from '../src/lib/utils'

import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import App from './App'
import './index.css'
import { ToastProvider } from './components/ui'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})

// GitHub Pages deep links: public/404.html stores the path it intercepted before
// sending the visitor to the app root. Put the URL back before React reads it, or a
// shared link to /donate lands on the homepage.
try {
  const restore = sessionStorage.getItem('spa-redirect')
  if (restore) {
    sessionStorage.removeItem('spa-redirect')
    window.history.replaceState(null, '', restore)
  }
} catch (e) {
  /* private browsing — nothing to restore */
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ToastProvider>
          <App />
          <Toaster
            position="bottom-right"
            richColors
            closeButton
            toastOptions={{
              style: { fontFamily: 'var(--font-sans)', fontSize: '13.5px' },
            }}
          />
        </ToastProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
)

import { useEffect, lazy, Suspense } from 'react'
import { Routes, Route, useLocation, Outlet } from 'react-router-dom'
import Navbar from './components/layout/Navbar'
import Footer from './components/layout/Footer'
import ChatWidget from './components/ChatWidget'
import MaintenanceScreen from './components/MaintenanceScreen'
import ConsentBanner from './components/ConsentBanner'
import { useAnalytics } from './lib/useAnalytics'
import Home from './pages/Home'
import About from './pages/About'
import Programs from './pages/Programs'
import ProgramDetail from './pages/ProgramDetail'
import Impact from './pages/Impact'
import Events from './pages/Events'
import Gallery from './pages/Gallery'
import Stories from './pages/Stories'
import StoryDetail from './pages/StoryDetail'
import Volunteer from './pages/Volunteer'
import Donate from './pages/Donate'
import Contact from './pages/Contact'
import NotFound from './pages/NotFound'
// The admin panel (Radix, Recharts, cmdk, react-hook-form) is code-split so public
// visitors never download it.
const Admin = lazy(() => import('./pages/admin/Admin'))
import { useContent, useSite } from './store/useSite'

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' in document.documentElement.style ? 'instant' : 'auto' })
  }, [pathname])
  return null
}

function PublicLayout() {
  const maintenance = useSite((s) => s.settings.maintenance)
  const authed = useSite((s) => s.authed)
  const settings = useSite((s) => s.settings)
  useAnalytics(settings)

  // Visitors get the holding page; a signed-in admin gets the real site so they can
  // see their own edits. /admin is outside this layout, so it stays reachable.
  if (maintenance?.enabled && !authed) return <MaintenanceScreen />

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
      <ChatWidget />
      <ConsentBanner />
    </div>
  )
}

function AdminSkeleton() {
  return (
    <div className="grid min-h-screen place-items-center bg-ink-900/[0.03]">
      <div className="flex items-center gap-3 text-sm font-semibold text-ink-500">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
        Loading control panel…
      </div>
    </div>
  )
}

export default function App() {
  const content = useContent()
  const theme = useSite((s) => s.theme)
  const location = useLocation()

  // Keep <title> and meta description in sync with editable content
  useEffect(() => {
    const org = content.org || {}
    const map = {
      '/': `${org.fullName} — ${content.hero?.title || ''}`.slice(0, 110),
      '/about': `About — ${org.fullName}`,
      '/programs': `Programmes — ${org.fullName}`,
      '/impact': `Impact & Reports — ${org.fullName}`,
      '/events': `Events — ${org.fullName}`,
      '/gallery': `Gallery — ${org.fullName}`,
      '/stories': `Stories — ${org.fullName}`,
      '/volunteer': `Volunteer — ${org.fullName}`,
      '/donate': `Donate — ${org.fullName}`,
      '/contact': `Contact — ${org.fullName}`,
      '/admin': `Control Panel — ${org.fullName}`,
    }
    document.title = map[location.pathname] || `${content.seo?.titleSuffix || org.fullName}`
    const desc = document.querySelector('meta[name="description"]')
    if (desc) desc.setAttribute('content', content.seo?.metaDescription || '')
  }, [location.pathname, content.org, content.seo])

  // runtime theme (hex → css vars) is applied on rehydrate; re-apply on nav
  useEffect(() => {
    const root = document.documentElement
    root.style.setProperty('--font-sans', 'ui-sans-serif, system-ui, sans-serif')
  }, [theme])

  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route element={<PublicLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/programs" element={<Programs />} />
          <Route path="/programs/:slug" element={<ProgramDetail />} />
          <Route path="/impact" element={<Impact />} />
          <Route path="/events" element={<Events />} />
          <Route path="/gallery" element={<Gallery />} />
          <Route path="/stories" element={<Stories />} />
          <Route path="/stories/:slug" element={<StoryDetail />} />
          <Route path="/volunteer" element={<Volunteer />} />
          <Route path="/donate" element={<Donate />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="*" element={<NotFound />} />
        </Route>
        <Route
          path="/admin"
          element={
            <Suspense fallback={<AdminSkeleton />}>
              <Admin />
            </Suspense>
          }
        />
      </Routes>
    </>
  )
}

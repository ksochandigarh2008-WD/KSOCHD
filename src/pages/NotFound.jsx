import { Link } from 'react-router-dom'
import { Home, ArrowLeft } from 'lucide-react'

export default function NotFound() {
  return (
    <section className="container-page flex min-h-[60vh] flex-col items-center justify-center py-20 text-center">
      <p className="font-display text-7xl font-bold text-brand-700">404</p>
      <h1 className="mt-4 font-display text-2xl font-bold sm:text-3xl">This page moved, or never existed.</h1>
      <p className="mt-3 max-w-md text-ink-700">
        Try the programmes page, or head back home. If something is broken, please tell us.
      </p>
      <div className="mt-7 flex flex-wrap justify-center gap-3">
        <Link to="/" className="btn-primary"><Home className="h-4 w-4" /> Back to home</Link>
        <Link to="/programs" className="btn-ghost"><ArrowLeft className="h-4 w-4" /> Browse programmes</Link>
      </div>
    </section>
  )
}

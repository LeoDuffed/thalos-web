import { lazy, Suspense, useEffect } from "react"
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom"
import { SiteFooter } from "@/components/site-footer"
import { SiteHeader } from "@/components/site-header"
import { HomePage } from "@/pages/home-page"
import { SolutionPage } from "@/pages/solution-page"
import "./App.css"

const DashboardPage = lazy(() => import("@/pages/dashboard-page").then((module) => ({ default: module.DashboardPage })))

function ScrollToTop() {
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" })
  }, [pathname])

  return null
}

function AppShell() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <ScrollToTop />
      <SiteHeader />
      <main>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/solucion" element={<SolutionPage />} />
          <Route path="/dashboard" element={<Suspense fallback={<p role="status" className="mx-auto max-w-7xl px-5 py-12 text-sm text-neutral-500">Cargando centro de control…</p>}><DashboardPage /></Suspense>} />
          <Route path="*" element={<HomePage />} />
        </Routes>
      </main>
      <SiteFooter />
    </div>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  )
}

export default App

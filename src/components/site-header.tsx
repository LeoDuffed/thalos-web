import { useState } from "react"
import { Menu, X } from "lucide-react"
import { Link, NavLink } from "react-router-dom"
import { BrandMark } from "@/components/brand-mark"

const navigation = [
  { label: "Inicio", to: "/" },
  { label: "Solución", to: "/solucion" },
  { label: "Testing", to: "/testing" },
]

export function SiteHeader() {
  const [open, setOpen] = useState(false)
  const navClass = ({ isActive }: { isActive: boolean }) =>
    `text-sm transition-colors ${isActive ? "font-medium text-black" : "text-neutral-500 hover:text-black"}`

  return (
    <header className="sticky top-0 z-50 border-b border-black/10 bg-white/90 backdrop-blur-xl">
      <div className="mx-auto flex h-17 max-w-7xl items-center justify-between px-5 lg:px-8">
        <Link to="/" onClick={() => setOpen(false)}>
          <BrandMark />
        </Link>
        <nav className="hidden items-center gap-8 md:flex" aria-label="Navegación principal">
          {navigation.map((item) => (
            <NavLink key={item.to} to={item.to} className={navClass}>
              {item.label}
            </NavLink>
          ))}
          <NavLink
            to="/dashboard"
            className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white transition-transform hover:-translate-y-0.5"
          >
            Centro de control
          </NavLink>
        </nav>
        <button
          type="button"
          className="grid size-10 place-items-center rounded-lg border border-black/10 md:hidden"
          aria-label={open ? "Cerrar menú" : "Abrir menú"}
          aria-expanded={open}
          onClick={() => setOpen((current) => !current)}
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>
      {open && (
        <nav
          className="border-t border-black/10 bg-white px-5 py-5 md:hidden"
          aria-label="Navegación móvil"
        >
          <div className="mx-auto flex max-w-7xl flex-col gap-4">
            {navigation.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={navClass}
                onClick={() => setOpen(false)}
              >
                {item.label}
              </NavLink>
            ))}
            <NavLink
              to="/dashboard"
              className="mt-1 rounded-lg bg-black px-4 py-3 text-center text-sm font-medium text-white"
              onClick={() => setOpen(false)}
            >
              Centro de control
            </NavLink>
          </div>
        </nav>
      )}
    </header>
  )
}

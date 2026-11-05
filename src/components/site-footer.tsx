import { Link } from "react-router-dom"
import { BrandMark } from "@/components/brand-mark"

export function SiteFooter() {
  return (
    <footer className="border-t border-black/10 bg-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-5 py-8 sm:flex-row sm:items-center sm:justify-between lg:px-8">
        <div>
          <BrandMark />
          <p className="mt-2 text-sm text-neutral-500">Radar, ESP32 y datos en tiempo real.</p>
        </div>
        <div className="flex flex-wrap gap-6 text-sm text-neutral-500">
          <Link className="hover:text-black" to="/solucion">
            Solución
          </Link>
          <Link className="hover:text-black" to="/dashboard">
            Centro de control
          </Link>
        </div>
      </div>
    </footer>
  )
}

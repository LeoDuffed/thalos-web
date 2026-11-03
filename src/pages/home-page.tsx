import {
  ArrowRight,
  EyeOff,
  Gauge,
  Network,
  Radar,
  Users,
  Wifi,
} from "lucide-react"
import { Link } from "react-router-dom"
import { FactoryPreview } from "@/components/factory-preview"

const capabilities = [
  {
    icon: Users,
    title: "Clasificación de presencia",
    text: "El sistema analizará señales para distinguir posibles personas de objetos, e indicará la confianza de cada detección.",
  },
  {
    icon: Gauge,
    title: "Distancia aproximada",
    text: "Cada detección incluirá una estimación de distancia al robot para identificar cuándo una persona se aproxima a su zona de operación.",
  },
  {
    icon: Radar,
    title: "Cobertura de ±20 metros",
    text: "Diseñaremos y probaremos el sistema para detectar presencia humana a una distancia máxima de 20 metros.",
  },
  {
    icon: Network,
    title: "Flota cooperativa",
    text: "Varios robots compartirán sus detecciones con una unidad maestra para ampliar la cobertura y reducir puntos ciegos.",
  },
  {
    icon: Wifi,
    title: "Datos en tiempo real",
    text: "Las detecciones se enviarán por WiFi a nuestra base de datos y aparecerán en el centro de control conforme se reciban.",
  },
  {
    icon: EyeOff,
    title: "Privacidad por diseño",
    text: "Los sensores de microondas permitirán detectar presencia y proximidad sin capturar imágenes de los trabajadores.",
  },
]

const architecture = [
  { number: "01", label: "Detección", text: "Los sensores identifican una posible persona y estiman su distancia a las zonas de riesgo." },
  { number: "02", label: "Clasificar", text: "El sistema analiza la detección para distinguir a una persona de objetos y determinar si está demasiado cerca." },
  { number: "03", label: "Activar protección", text: "Si una persona entra en la zona peligrosa, se activa el paro seguro de la maquinaria asociada." },
  { number: "04", label: "Visualizar", text: "El centro de control muestra la detección, la alerta y el estado reportado por la maquinaria." },
]

export function HomePage() {
  return (
    <>
      <section className="relative overflow-hidden border-b border-black/10">
        <div className="surface-grid absolute inset-0 opacity-50" />
        <div className="relative mx-auto grid max-w-7xl gap-14 px-5 py-20 lg:grid-cols-[1.02fr_.98fr] lg:items-center lg:px-8 lg:py-28">
          <div className="max-w-2xl">
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs font-medium">
              <span className="size-1.5 rounded-full bg-black" />
              SEGURIDAD SIN CÁMARAS
            </div>
            <h1 className="text-balance text-5xl font-medium leading-[0.98] tracking-[-0.065em] sm:text-6xl lg:text-[5.25rem]">
              La detección humana que se mueve con la planta.
            </h1> 
            <p className="mt-7 max-w-xl text-lg leading-relaxed text-neutral-600">
              Una flota de robots móviles que identifica presencia humana, estima distancia y
              orientación, y comparte cada evento en tiempo real.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link
                className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-black px-5 text-sm font-medium text-white transition-transform hover:-translate-y-0.5"
                to="/solucion"
              >
                Explorar la solución <ArrowRight className="size-4" />
              </Link>
              <Link
                className="inline-flex h-12 items-center justify-center rounded-lg border border-black/15 bg-white px-5 text-sm font-medium transition-colors hover:bg-[#DCDCDC]/40"
                to="/dashboard"
              >
                Ver centro de control
              </Link>
            </div>
          </div>
          <FactoryPreview />
        </div>
      </section>

      <section className="border-b border-black/10 bg-[#121212] text-white">
        <div className="mx-auto grid max-w-7xl grid-cols-2 divide-x divide-y divide-white/10 px-5 sm:grid-cols-4 sm:divide-y-0 lg:px-8">
          {[
            ["≤ 20 m", "Rango objetivo"],
            ["360°", "Cobertura escalable"],
            ["24/7", "Monitoreo continuo"],
            ["0", "Cámaras utilizadas"],
          ].map(([value, label]) => (
            <div className="px-5 py-7 text-center" key={label}>
              <p className="text-2xl font-medium tracking-tight">{value}</p>
              <p className="mt-1 text-xs text-white/45">{label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-24 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[.7fr_1.3fr]">
          <div>
            <p className="section-label">CAPACIDADES</p>
            <h2 className="mt-4 max-w-md text-4xl font-medium tracking-[-0.05em] sm:text-5xl">
              Seguridad que entiende el contexto.
            </h2>
          </div>
          <p className="max-w-2xl self-end text-lg leading-relaxed text-neutral-600">
            Thalos transforma detecciones aisladas en información útil para que vehículos
            autónomos y operadores comprendan lo que ocurre alrededor de cada unidad.
          </p>
        </div>
        <div className="mt-14 grid gap-px overflow-hidden rounded-2xl border border-black/10 bg-black/10 md:grid-cols-2 lg:grid-cols-3">
          {capabilities.map(({ icon: Icon, title, text }) => (
            <article
              className="group bg-white p-7 transition-colors hover:bg-[#DCDCDC]/30"
              key={title}
            >
              <div className="grid size-11 place-items-center rounded-xl bg-black text-white">
                <Icon className="size-5" />
              </div>
              <h3 className="mt-8 text-lg font-medium tracking-tight">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-neutral-500">{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-black/10 bg-[#DCDCDC]/35">
        <div className="mx-auto max-w-7xl px-5 py-24 lg:px-8">
          <div className="max-w-2xl">
            <p className="section-label">CÓMO FUNCIONA</p>
            <h2 className="mt-4 text-4xl font-medium tracking-[-0.05em] sm:text-5xl">
              De la detección a la protección.
            </h2>
          </div>
          <div className="mt-14 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {architecture.map((step) => (
              <article
                className="rounded-2xl border border-black/10 bg-white p-6"
                key={step.number}
              >
                <span className="font-mono text-xs text-neutral-400">{step.number}</span>
                <h3 className="mt-12 text-xl font-medium">{step.label}</h3>
                <p className="mt-2 text-sm leading-relaxed text-neutral-500">{step.text}</p>
              </article>
            ))}
          </div>
          <Link
            className="mt-8 inline-flex items-center gap-2 text-sm font-medium underline decoration-neutral-300 underline-offset-4"
            to="/solucion"
          >
            Conocer la arquitectura completa <ArrowRight className="size-4" />
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-24 lg:px-8">
        <div className="relative overflow-hidden rounded-[2rem] bg-black px-6 py-16 text-white sm:px-12 lg:px-16">
          <div className="dot-grid absolute inset-0 opacity-20" />
          <div className="relative max-w-3xl">
            <p className="text-xs font-medium tracking-[0.18em] text-white/50">CENTRO DE CONTROL</p>
            <h2 className="mt-5 text-4xl font-medium tracking-[-0.05em] sm:text-6xl">
              Toda la flota. Una sola vista.
            </h2>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-white/60">
              Visualiza robots conectados, detecciones activas, distancias y zonas de riesgo desde
              un panel diseñado para reaccionar rápido.
            </p>
            <Link
              className="mt-8 inline-flex h-12 items-center gap-2 rounded-lg bg-white px-5 text-sm font-medium text-black"
              to="/dashboard"
            >
              Abrir demostración <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}

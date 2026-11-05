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
    title: "Seguimiento de objetivos",
    text: "El radar HLK-LD2450 reporta hasta tres objetivos con su posición y velocidad. Cada ranura aparece en el centro de control.",
  },
  {
    icon: Gauge,
    title: "Posición y distancia",
    text: "Las coordenadas X e Y permiten calcular la distancia y el ángulo de cada objetivo respecto al sensor.",
  },
  {
    icon: Radar,
    title: "Campo de detección",
    text: "El tablero representa un campo frontal de 6 metros y ±60°. Las pruebas del prototipo nos permitirán caracterizar su alcance en cada entorno.",
  },
  {
    icon: Network,
    title: "Un solo prototipo",
    text: "Trabajamos con un robot y una ESP32. En esta etapa mantenemos el sensor fijo para comprobar sus lecturas y su orientación.",
  },
  {
    icon: Wifi,
    title: "Datos en tiempo real",
    text: "La ESP32 envía las lecturas por WiFi a Firebase. La página se actualiza conforme llegan nuevos datos del sensor.",
  },
  {
    icon: EyeOff,
    title: "Detección sin cámaras",
    text: "El radar entrega coordenadas y velocidad sin capturar imágenes. La visualización se construye a partir de esas mediciones.",
  },
]

const architecture = [
  { number: "01", label: "Detección", text: "El HLK-LD2450 mide la posición y velocidad de los objetivos frente al sensor." },
  { number: "02", label: "Interpretar", text: "La ESP32 interpreta las tramas del radar y prepara las lecturas válidas para enviarlas." },
  { number: "03", label: "Compartir", text: "El enlace WiFi lleva los datos a Firebase, donde cada reporte actualiza la última medición." },
  { number: "04", label: "Visualizar", text: "El centro de control muestra los objetivos, sus mediciones y el estado de las conexiones." },
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
              PROTOTIPO EN DESARROLLO
            </div>
            <h1 className="text-balance text-5xl font-medium leading-[0.98] tracking-[-0.065em] sm:text-6xl lg:text-[5.25rem]">
              Del radar a la web, en tiempo real.
            </h1> 
            <p className="mt-7 max-w-xl text-lg leading-relaxed text-neutral-600">
              Un robot, un radar HLK-LD2450 y una ESP32. Conectamos las lecturas reales
              del sensor con una página que muestra posición, distancia y velocidad.
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
            ["1", "Robot en el prototipo"],
            ["3", "Objetivos como máximo"],
            ["WiFi", "Envío a Firebase"],
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
              Lecturas reales. Un sistema conectado.
            </h2>
          </div>
          <p className="max-w-2xl self-end text-lg leading-relaxed text-neutral-600">
            La primera etapa de Thalos conecta el sensor con el centro de control.
            Podemos observar sus mediciones, comprobar la comunicación y preparar la integración de nuevos sensores.
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
              De la medición a la pantalla.
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
              Tu sensor. Una vista en vivo.
            </h2>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-white/60">
              Observa los objetivos del radar, consulta sus coordenadas y distingue el estado
              de Firebase, la ESP32 y el sensor desde un mismo panel.
            </p>
            <Link
              className="mt-8 inline-flex h-12 items-center gap-2 rounded-lg bg-white px-5 text-sm font-medium text-black"
              to="/dashboard"
            >
              Ver lecturas del sensor <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}

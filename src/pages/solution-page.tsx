import {
  ArrowRight,
  Bot,
  CheckCircle2,
  CircuitBoard,
  Cloud,
  Cpu,
  Database,
  FlaskConical,
  Radar,
  Wifi,
} from "lucide-react"
import { Link } from "react-router-dom"

const layers = [
  {
    icon: Radar,
    eyebrow: "CAPA 01",
    title: "Detección",
    text: "Los robots móviles recorren la planta y utilizan sensores para detectar presencia y estimar distancias.",
  },
  {
    icon: Cpu,
    eyebrow: "CAPA 02",
    title: "Procesamiento local",
    text: "Cada carrito analiza las lecturas de sus sensores y envía las detecciones relevantes al cerebro central.",
  },
  {
    icon: CircuitBoard,
    eyebrow: "CAPA 03",
    title: "Coordinación",
    text: "La NUCLEO-H755ZI-Q reúne la información de la flota e identifica cuándo una persona se acerca a una zona peligrosa.",
  },
  {
    icon: Cloud,
    eyebrow: "CAPA 04",
    title: "Supervisión",
    text: "La plataforma web muestra las detecciones, las alertas y las solicitudes de paro de maquinaria registradas en la bse de datos.",
  },
]

const requirements = [
  "Clasificación humano, animal y objeto",
  "Estimación de distancia y orientación",
  "Conteo aproximado de personas",
  "Cobertura mínima de cinco metros",
  "Comunicación en tiempo real con Firebase",
  "Diseño e integración en PCB propia",
]

const validation = [
  {
    id: "01",
    title: "Caracterizar",
    text: "Recopilaremos señales de personas, animales y objetos a distintas distancias para conocer cómo responden los sensores.",
  },
  {
    id: "02",
    title: "Clasificar",
    text: "Desarrollaremos un método para identificar posibles personas y asignar un nivel de confianza a cada detección.",
  },
  {
    id: "03",
    title: "Integrar",
    text: "Conectaremos los robots con la NUCLEO-H755ZI-Q, la base de datos y la interfaz que solicitará el paro de maquinaria.",
  },
  {
    id: "04",
    title: "Validar",
    text: "Mediremos alcance, errores y tiempo de respuesta. También probaremos la solicitud de paro cuando una persona entre en una zona de riesgo.",
  },
]

export function SolutionPage() {
  return (
    <>
      <section className="border-b border-black/10 bg-[#121212] text-white">
        <div className="dot-grid mx-auto max-w-7xl px-5 py-20 lg:px-8 lg:py-28">
          <p className="text-xs font-medium tracking-[0.2em] text-white/45">
            ARQUITECTURA THALOS
          </p>
          <div className="mt-6 grid gap-8 lg:grid-cols-[1.1fr_.9fr] lg:items-end">
            <h1 className="max-w-3xl text-5xl font-medium leading-[1] tracking-[-0.06em] sm:text-7xl">
              Una red móvil alrededor de las personas.
            </h1>
            <p className="max-w-xl text-lg leading-relaxed text-white/60">
              Cada vehículo percibe una parte del entorno. El coordinador reúne esas perspectivas y
              las convierte en una vista compartida de la planta.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-24 lg:px-8">
        <div className="grid gap-4 lg:grid-cols-4">
          {layers.map(({ icon: Icon, eyebrow, title, text }, index) => (
            <article
              className="relative rounded-2xl border border-black/10 bg-white p-6"
              key={title}
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-[11px] text-neutral-400">{eyebrow}</span>
                <Icon className="size-5" />
              </div>
              <h2 className="mt-14 text-xl font-medium">{title}</h2>
              <p className="mt-3 text-sm leading-relaxed text-neutral-500">{text}</p>
              {index < layers.length - 1 && (
                <ArrowRight className="absolute -right-3 top-1/2 z-10 hidden size-5 rounded-full bg-black p-1 text-white lg:block" />
              )}
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-black/10 bg-[#DCDCDC]/35">
        <div className="mx-auto grid max-w-7xl gap-14 px-5 py-24 lg:grid-cols-2 lg:px-8">
          <div>
            <p className="section-label">FLUJO DE INFORMACIÓN</p>
            <h2 className="mt-4 text-4xl font-medium tracking-[-0.05em] sm:text-5xl">
              Distribuido en campo. Unificado en la nube.
            </h2>
            <p className="mt-5 max-w-xl leading-relaxed text-neutral-600">
              El procesamiento se reparte para reducir la dependencia de un solo sensor. La nube
              recibe eventos compactos, no video ni información biométrica.
            </p>
          </div>
          <div className="rounded-2xl bg-[#121212] p-5 text-white sm:p-8">
            <div className="space-y-3">
              {[
                { icon: Bot, title: "Flota de robots", detail: "Rb-01 · Rb-02 · Rb-03" },
                { icon: CircuitBoard, title: "Coordinador maestro", detail: "NUCLEO-H755ZI-Q" },
                { icon: Wifi, title: "Enlace industrial", detail: "WiFi · Mensajes estructurados" },
                {
                  icon: Database,
                  title: "Base de datos",
                  detail: "Estado actual · Historial de eventos",
                },
              ].map(({ icon: Icon, title, detail }, index) => (
                <div
                  className="flex items-center gap-4 rounded-xl border border-white/10 bg-white/5 p-4"
                  key={title}
                >
                  <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-white text-black">
                    <Icon className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{title}</p>
                    <p className="mt-0.5 truncate text-xs text-white/45">{detail}</p>
                  </div>
                  <span className="font-mono text-[10px] text-white/30">0{index + 1}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-24 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-[.8fr_1.2fr]">
          <div>
            <p className="section-label">ALCANCE DEL RETO</p>
            <h2 className="mt-4 text-4xl font-medium tracking-[-0.05em]">
              Diseñado alrededor de los requisitos.
            </h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {requirements.map((requirement) => (
              <div
                className="flex items-start gap-3 rounded-xl border border-black/10 p-4"
                key={requirement}
              >
                <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
                <span className="text-sm leading-relaxed text-neutral-600">{requirement}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-black/10 bg-[#121212] text-white">
        <div className="mx-auto max-w-7xl px-5 py-24 lg:px-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="flex items-center gap-2 text-xs font-medium tracking-[0.18em] text-white/45">
                <FlaskConical className="size-4" /> PLAN DE VALIDACIÓN
              </p>
              <h2 className="mt-4 text-4xl font-medium tracking-[-0.05em] sm:text-5xl">
                Medir antes de prometer.
              </h2>
            </div>
            <p className="max-w-md text-sm leading-relaxed text-white/50">
              La clasificación se comunicará siempre con su nivel de confianza y será evaluada en
              escenarios controlados.
            </p>
          </div>
          <div className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 md:grid-cols-4">
            {validation.map((item) => (
              <article className="bg-[#121212] p-6" key={item.id}>
                <span className="font-mono text-xs text-white/30">{item.id}</span>
                <h3 className="mt-10 text-lg font-medium">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/45">{item.text}</p>
              </article>
            ))}
          </div>
          <Link
            className="mt-10 inline-flex h-12 items-center gap-2 rounded-lg bg-white px-5 text-sm font-medium text-black"
            to="/dashboard"
          >
            Ver datos de ejemplo <ArrowRight className="size-4" />
          </Link>
        </div>
      </section>
    </>
  )
}

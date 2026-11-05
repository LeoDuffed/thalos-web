import {
  ArrowRight,
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
    text: "El HLK-LD2450 entrega coordenadas y velocidad de hasta tres objetivos. Las primeras pruebas se realizan con el sensor fijo.",
  },
  {
    icon: Cpu,
    eyebrow: "CAPA 02",
    title: "Procesamiento local",
    text: "La ESP32 lee el radar por UART, interpreta las tramas y prepara un reporte con las mediciones válidas.",
  },
  {
    icon: Database,
    eyebrow: "CAPA 03",
    title: "Datos en Firebase",
    text: "La ESP32 envía los reportes por WiFi y HTTPS. Firebase Realtime Database conserva la última lectura y el estado del dispositivo.",
  },
  {
    icon: Cloud,
    eyebrow: "CAPA 04",
    title: "Supervisión",
    text: "La página escucha los cambios en Firebase y actualiza el radar, la tabla de objetivos y los indicadores de conexión.",
  },
]

const requirements = [
  "Lectura real del HLK-LD2450 con ESP32",
  "Visualización de posición, distancia y ángulo",
  "Conteo de objetivos reportados por el radar",
  "Consulta de la velocidad de cada objetivo",
  "Actualización en tiempo real mediante Firebase",
  "Estado independiente de ESP32, radar y base de datos",
]

const validation = [
  {
    id: "01",
    title: "Leer el sensor",
    text: "Ya recibimos tramas reales del HLK-LD2450 en la ESP32 y comprobamos el cambio de coordenadas y el conteo de objetivos.",
  },
  {
    id: "02",
    title: "Conectar",
    text: "Validamos el envío por WiFi a Firebase tanto en casa como en la escuela, con la cuenta dedicada del dispositivo.",
  },
  {
    id: "03",
    title: "Mostrar",
    text: "El centro de control ya muestra lecturas reales, distingue los datos caducados y presenta el radar en vista espejo.",
  },
  {
    id: "04",
    title: "Caracterizar",
    text: "El siguiente paso es probar distintas posiciones, distancias y entornos para medir estabilidad, alcance y tiempo de respuesta antes de incorporar más sensores.",
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
              Un robot. Del sensor a la pantalla.
            </h1>
            <p className="max-w-xl text-lg leading-relaxed text-white/60">
              El prototipo actual une un radar HLK-LD2450, una ESP32 y Firebase.
              La primera integración permite consultar las mediciones del sensor desde el centro de control.
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
              Una lectura, de extremo a extremo.
            </h2>
            <p className="mt-5 max-w-xl leading-relaxed text-neutral-600">
              La ESP32 interpreta los datos del radar y los envía por WiFi. Firebase actualiza
              la última medición y la página la representa en un mapa y una tabla. En esta etapa guardamos el estado más reciente.
            </p>
          </div>
          <div className="rounded-2xl bg-[#121212] p-5 text-white sm:p-8">
            <div className="space-y-3">
              {[
                { icon: Radar, title: "Radar HLK-LD2450", detail: "Posición y velocidad · Robot 01 fijo" },
                { icon: CircuitBoard, title: "ESP32", detail: "Lectura por UART · Reportes por HTTPS" },
                { icon: Wifi, title: "Conexión WiFi", detail: "Envío de lecturas a Firebase" },
                {
                  icon: Database,
                  title: "Firebase y centro de control",
                  detail: "Última lectura · Visualización en tiempo real",
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
            <p className="section-label">FUNCIONES ACTUALES</p>
            <h2 className="mt-4 text-4xl font-medium tracking-[-0.05em]">
              La primera integración ya funciona.
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
                <FlaskConical className="size-4" /> AVANCES Y SIGUIENTES PASOS
              </p>
              <h2 className="mt-4 text-4xl font-medium tracking-[-0.05em] sm:text-5xl">
                Una base para seguir probando.
              </h2>
            </div>
            <p className="max-w-md text-sm leading-relaxed text-white/50">
              La comunicación ya está validada. Ahora seguimos caracterizando el sensor
              con el robot fijo para entender sus lecturas en distintos escenarios.
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
            Ver lecturas del sensor <ArrowRight className="size-4" />
          </Link>
        </div>
      </section>
    </>
  )
}

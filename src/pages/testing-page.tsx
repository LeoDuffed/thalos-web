import { useEffect, useRef, useState } from "react"
import type { ChangeEvent, KeyboardEvent } from "react"
import { Check, Eraser, FlaskConical, FlipHorizontal, RotateCw, Thermometer, Upload } from "lucide-react"
import { automaticRange, displayPixelIndex, parseThermalInput, readManualRange, thermalColor, thermalGradient, thermalStats } from "@/lib/thermal"
import type { TemperatureUnit } from "@/lib/thermal"
import { getThermalReadingState } from "@/lib/thermal"
import { ageLabel, formatTime } from "@/lib/telemetry"
import { useThermalTelemetry } from "@/hooks/use-thermal-telemetry"

const inputClass = "w-full rounded-lg border border-black/15 bg-white px-3 py-2.5 text-sm outline-none focus-visible:border-black focus-visible:ring-1 focus-visible:ring-black"
const buttonClass = "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-black/15 bg-white px-3 py-2 text-sm font-medium transition-colors hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black disabled:cursor-not-allowed disabled:opacity-40"

type LoadedFrame = { pixels: number[]; loadedAt: number; name: string }

export function TestingPage() {
  const [manualFrame, setManualFrame] = useState<LoadedFrame | null>(null)
  const [source, setSource] = useState<"live" | "manual">("live")
  const [now, setNow] = useState(() => Date.now())
  const live = useThermalTelemetry(source === "live")
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1_000)
    return () => window.clearInterval(timer)
  }, [])
  const liveState = getThermalReadingState(live.reading, live.status.lastSeenAt, now + live.serverOffset, live.connected)
  const frame: LoadedFrame | null = source === "manual" ? manualFrame : live.reading ? { pixels: live.reading.pixels, loadedAt: live.reading.updatedAt, name: `Cuadro #${live.reading.sequence}` } : null
  const liveLabel = live.error ? "Error de lectura" : !live.loaded ? "Conectando" : !live.connected ? "Sin conexión" : !live.reading ? "Esperando matriz" : !liveState.espOnline ? "ESP32 sin reporte" : !liveState.fresh ? "Lectura caducada" : "En vivo"
  const [text, setText] = useState("")
  const [unit, setUnit] = useState<TemperatureUnit>("celsius")
  const [error, setError] = useState<string | null>(null)
  const [automatic, setAutomatic] = useState(true)
  const [minimum, setMinimum] = useState("20")
  const [maximum, setMaximum] = useState("40")
  const [valuesVisible, setValuesVisible] = useState(true)
  const [turns, setTurns] = useState(0)
  const [mirrored, setMirrored] = useState(false)
  const [selected, setSelected] = useState(0)
  const [fileName, setFileName] = useState<string | null>(null)
  const pixelButtons = useRef<(HTMLButtonElement | null)[]>([])
  const fileInput = useRef<HTMLInputElement>(null)
  const fileRequest = useRef(0)
  const stats = frame ? thermalStats(frame.pixels) : null
  const range = automatic && stats ? automaticRange(stats) : readManualRange(minimum, maximum)
  const value = frame?.pixels[selected] ?? null
  const selectedColor = value !== null && range ? thermalColor(value, range) : null
  const displayIndices = Array.from({ length: 64 }, (_, index) => displayPixelIndex(Math.floor(index / 8), index % 8, turns, mirrored))

  function loadReading() {
    try {
      const pixels = parseThermalInput(text, unit)
      setManualFrame({ pixels, loadedAt: Date.now(), name: fileName ?? "Texto de consola / JSON" })
      setSelected(0)
      setError(null)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo interpretar la lectura.")
    }
  }

  async function readFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    const request = ++fileRequest.current
    event.target.value = ""
    if (!file) return
    if (file.size > 16_000) { setError("El archivo es demasiado grande. Usa solo un cuadro de 64 temperaturas."); return }
    try {
      const content = await file.text()
      if (request !== fileRequest.current) return
      setText(content)
      setFileName(file.name)
      setError(null)
    } catch { if (request === fileRequest.current) setError("No se pudo abrir el archivo. Intenta pegar el bloque de temperaturas.") }
  }

  function clearReading() {
    fileRequest.current++
    setManualFrame(null)
    setText("")
    setFileName(null)
    setSelected(0)
    setError(null)
  }

  // las flechas recorren la cuadrícula sin obligar a usar Tab 64 veces
  function movePixel(event: KeyboardEvent<HTMLButtonElement>, displayIndex: number) {
    const row = Math.floor(displayIndex / 8)
    const col = displayIndex % 8
    const next = event.key === "ArrowRight" ? row * 8 + Math.min(7, col + 1)
      : event.key === "ArrowLeft" ? row * 8 + Math.max(0, col - 1)
      : event.key === "ArrowDown" ? Math.min(7, row + 1) * 8 + col
      : event.key === "ArrowUp" ? Math.max(0, row - 1) * 8 + col : null
    if (next === null) return
    event.preventDefault()
    setSelected(displayIndices[next])
    pixelButtons.current[next]?.focus()
  }

  return <div className="min-h-screen bg-[#f6f6f6] pb-12">
    <section className="border-b border-black/10 bg-white">
      <div className="mx-auto max-w-7xl px-5 py-9 lg:px-8 lg:py-11">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-neutral-500"><FlaskConical className="size-4" aria-hidden="true" /> Laboratorio de sensores</p>
          <span className="rounded-md border border-black/10 bg-neutral-50 px-3 py-1.5 text-xs text-neutral-500">AMG8831 · 8 × 8</span>
        </div>
        <h1 className="mt-4 text-4xl font-medium tracking-[-0.05em] sm:text-5xl">Testing<span className="text-neutral-400"> / térmica</span></h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-neutral-500">Una temperatura por píxel. Sigue las lecturas de tu matriz en vivo o explora un cuadro guardado de la consola.</p>
      </div>
    </section>

    <div className="mx-auto max-w-7xl space-y-5 px-5 pt-6 lg:px-8">
      <section className="space-y-4 rounded-xl border border-black/10 bg-white px-5 py-4 text-sm" aria-label="Origen de las temperaturas">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2" role="group" aria-label="Origen de datos">
            <button type="button" aria-pressed={source === "live"} onClick={() => setSource("live")} className={`${buttonClass} ${source === "live" ? "border-black bg-neutral-100" : ""}`}>En vivo</button>
            <button type="button" aria-pressed={source === "manual"} onClick={() => setSource("manual")} className={`${buttonClass} ${source === "manual" ? "border-black bg-neutral-100" : ""}`}>Carga manual</button>
          </div>
          <span role="status" className={`shrink-0 rounded-md px-2.5 py-1 text-xs font-medium ${source === "live" && liveState.current && !live.error ? "bg-emerald-50 text-emerald-800" : "bg-neutral-100 text-neutral-600"}`}>{source === "live" ? liveLabel.toUpperCase() : "MODO LOCAL"}</span>
        </div>
        {source === "live" ? <div className="space-y-2 text-neutral-600">
          <p>Las temperaturas llegan automáticamente desde la ESP32 por Firebase · {live.deviceId}.</p>
          {live.reading && <p className="text-xs text-neutral-500">Cuadro #{live.reading.sequence} · Recibido por la ESP32 a las {formatTime(live.reading.updatedAt)} · {ageLabel(live.reading.updatedAt, now + live.serverOffset)}</p>}
          {live.error ? <div role="alert" className="flex flex-wrap items-center gap-3 rounded-lg bg-red-50 p-3 text-red-800"><p className="flex-1">{live.error}</p><button type="button" className={buttonClass} onClick={live.retry}>Reintentar</button></div>
            : live.loaded && !liveState.current && <p className="rounded-lg bg-amber-50 p-3 text-amber-900">{!live.connected ? "Sin conexión con Firebase." : !live.reading ? "Todavía no hay una matriz térmica recibida." : !liveState.espOnline ? "La ESP32 no tiene un reporte reciente." : "La última matriz tiene más de 5 segundos y está caducada."}{live.reading ? " Se conserva la última lectura como referencia." : " Los colores aparecerán cuando lleguen las 64 temperaturas."}</p>}
        </div> : <p className="leading-relaxed text-neutral-600">Carga una lectura real de la consola o un archivo. Los datos se procesan en tu navegador y no se envían a Firebase.</p>}
      </section>

      <section className="grid grid-cols-3 gap-2 sm:gap-3" aria-label="Resumen de temperaturas">
        {[
          { label: "Temperatura mínima", value: stats?.min, detail: "El píxel más frío de la lectura" },
          { label: "Temperatura media", value: stats?.average, detail: "Promedio de los 64 píxeles" },
          { label: "Temperatura máxima", value: stats?.max, detail: stats ? `Píxel P${stats.hottestIndex + 1}` : "El píxel más cálido de la lectura" },
        ].map(item => <article key={item.label} className="rounded-2xl border border-black/10 bg-white p-3 sm:p-5">
          <div className="flex items-center justify-between gap-3"><h2 className="text-xs leading-relaxed text-neutral-500 sm:text-sm">{item.label}</h2><Thermometer className="hidden size-4 shrink-0 text-neutral-400 sm:block" aria-hidden="true" /></div>
          <p className="mt-3 font-mono text-xl font-medium tracking-tight tabular-nums sm:mt-4 sm:text-3xl">{item.value === undefined ? "—" : item.value.toFixed(2)}<span className="ml-1 text-xs font-normal text-neutral-400 sm:ml-2 sm:text-base">°C</span></p>
          <p className="mt-2 hidden text-xs text-neutral-400 sm:block">{item.detail}</p>
        </article>)}
      </section>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <section className="overflow-hidden rounded-2xl border border-black/10 bg-[#111111] text-white" aria-label="Mapa de temperaturas">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-5 py-5 sm:px-6">
            <div><h2 className="text-lg font-medium">Matriz térmica</h2><p className="mt-1 text-sm text-white/50">64 píxeles · orden de recepción</p></div>
            <span className="rounded-md border border-white/15 px-2.5 py-1.5 text-xs text-white/60">{source === "live" ? liveLabel.toUpperCase() : frame ? "LECTURA LOCAL" : "ESPERANDO LECTURA"}</span>
          </div>
          <div className="px-4 pb-6 pt-5 sm:px-6">
            <p className="mb-4 text-center text-xs tracking-widest text-white/40">ARRIBA DE LA VISTA · {turns * 90}°{mirrored ? " · ESPEJO" : ""}</p>
            <div className="relative mx-auto max-w-xl">
              <div className={`grid grid-cols-8 gap-1 rounded-xl bg-[#080808] p-2 ${source === "live" && frame && (!liveState.current || live.error) ? "opacity-50" : ""}`} aria-label="Cuadrícula térmica de 8 por 8">
                {displayIndices.map((pixelIndex, displayIndex) => {
                  const temperature = frame?.pixels[pixelIndex]
                  const colors = temperature !== undefined && range ? thermalColor(temperature, range) : null
                  const isSelected = !!frame && selected === pixelIndex
                  return <button key={displayIndex} ref={element => { pixelButtons.current[displayIndex] = element }} type="button"
                    disabled={!frame} tabIndex={isSelected ? 0 : -1} aria-pressed={isSelected}
                    aria-label={`Píxel P${pixelIndex + 1}, fila ${Math.floor(pixelIndex / 8) + 1}, columna ${pixelIndex % 8 + 1}${temperature === undefined ? ", sin datos" : `, ${temperature.toFixed(2)} grados Celsius`}`}
                    title={temperature === undefined ? `P${pixelIndex + 1} · Sin datos` : `P${pixelIndex + 1} · ${temperature.toFixed(2)} °C`}
                    onClick={() => setSelected(pixelIndex)} onKeyDown={event => movePixel(event, displayIndex)}
                    className={`relative flex aspect-square min-w-0 items-center justify-center rounded-sm border font-mono text-[clamp(.6rem,1.8vw,1rem)] tabular-nums transition-[outline] focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:cursor-default ${isSelected ? "z-10 border-white outline-2 outline-offset-1 outline-white" : "border-white/5"}`}
                    style={{ backgroundColor: colors?.background ?? "#202020", color: colors?.foreground ?? "#555" }}>
                    {temperature === undefined ? "·" : valuesVisible ? temperature.toFixed(1) : <span className="sr-only">{temperature.toFixed(2)}</span>}
                    {isSelected && <span className="absolute right-0.5 top-0.5 size-1 rounded-full" style={{ backgroundColor: colors?.foreground ?? "white" }} />}
                  </button>
                })}
              </div>
              {!frame && <div className="pointer-events-none absolute inset-0 flex items-center justify-center"><div className="mx-4 rounded-xl border border-white/10 bg-[#111]/95 px-5 py-4 text-center shadow-xl"><Thermometer className="mx-auto mb-2 size-6 text-white/40" aria-hidden="true" /><p className="text-sm text-white/80">Esperando las 64 temperaturas</p><p className="mt-1 text-xs text-white/40">Los colores aparecerán con una lectura.</p></div></div>}
            </div>
            <div className="mx-auto mt-6 max-w-xl">
              <div className="h-3 rounded-full" style={{ background: range ? thermalGradient : "#333" }} aria-hidden="true" />
              <div className="mt-2 flex justify-between font-mono text-sm text-white/70"><span>{range ? `${range.min.toFixed(1)} °C` : "—"}</span><span>{range ? `${range.max.toFixed(1)} °C` : "—"}</span></div>
              <div className="mt-2 flex justify-between text-xs text-white/40"><span>Más frío</span><span>Intermedio</span><span>Más cálido</span></div>
            </div>
          </div>
          <div className="border-t border-white/10 px-5 py-4 text-sm leading-relaxed text-white/45 sm:px-6">{automatic ? "Escala relativa: los colores se ajustan al mínimo y al máximo de cada lectura." : "Escala fija: la misma temperatura conserva su color entre lecturas."}</div>
        </section>

        <aside className="space-y-5">
          <section className="rounded-2xl border border-black/10 bg-white p-5 sm:p-6">
            <h2 className="text-lg font-medium tracking-tight">Visualización</h2>
            <fieldset className="mt-5"><legend className="text-sm text-neutral-500">Escala de color</legend>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {[false, true].map(auto => <button key={String(auto)} type="button" aria-pressed={automatic === auto} onClick={() => setAutomatic(auto)} className={`${buttonClass} ${automatic === auto ? "border-black bg-neutral-100" : ""}`}>{auto ? "Automática" : "Fija"}</button>)}
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <label className="text-sm text-neutral-500">Mínimo (°C)<input type="number" step="0.5" value={minimum} disabled={automatic} onChange={event => setMinimum(event.target.value)} className={`${inputClass} mt-1.5 disabled:bg-neutral-100 disabled:text-neutral-400`} /></label>
                <label className="text-sm text-neutral-500">Máximo (°C)<input type="number" step="0.5" value={maximum} disabled={automatic} onChange={event => setMaximum(event.target.value)} className={`${inputClass} mt-1.5 disabled:bg-neutral-100 disabled:text-neutral-400`} /></label>
              </div>
              {!range && <p role="alert" className="mt-3 text-sm text-red-700">El mínimo debe ser menor que el máximo. Completa ambos valores para aplicar los colores.</p>}
              {automatic && !frame && <p className="mt-3 text-xs text-neutral-500">La escala se ajustará al cargar una lectura.</p>}
            </fieldset>
            <label className="mt-5 flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" checked={valuesVisible} onChange={event => setValuesVisible(event.target.checked)} className="size-4 accent-black" />Mostrar temperatura en cada píxel</label>
            <div className="mt-4 border-t border-black/10 pt-5">
              <p className="text-sm text-neutral-500">Orientación de la vista</p>
              <div className="mt-2 flex flex-wrap gap-2"><button type="button" className={buttonClass} onClick={() => setTurns(previous => (previous + 1) % 4)}><RotateCw className="size-4" aria-hidden="true" />Girar 90°</button><button type="button" aria-pressed={mirrored} className={`${buttonClass} ${mirrored ? "border-black bg-neutral-100" : ""}`} onClick={() => setMirrored(previous => !previous)}><FlipHorizontal className="size-4" aria-hidden="true" />Espejo</button></div>
              <p className="mt-3 text-xs leading-relaxed text-neutral-400">Estos ajustes conservan las mediciones. La orientación física se comprobará al probar la matriz.</p>
            </div>
          </section>

          <section className="rounded-2xl border border-black/10 bg-white p-5 sm:p-6" aria-label="Píxel seleccionado">
            <p className="text-xs uppercase tracking-widest text-neutral-400">Detalle del píxel</p>
            <div className="mt-4 flex items-center gap-4">
              <span className="size-14 shrink-0 rounded-xl border border-black/10" style={{ backgroundColor: selectedColor?.background ?? "#ededed" }} aria-hidden="true" />
              <div><h2 className="text-lg font-medium">{frame ? `P${selected + 1}` : "Sin selección"}</h2><p className="mt-1 text-sm text-neutral-500">{frame ? `Fila ${Math.floor(selected / 8) + 1} · Columna ${selected % 8 + 1}` : "Selecciona un píxel al cargar datos"}</p></div>
            </div>
            <p className="mt-5 font-mono text-4xl tracking-tight">{value === null ? "—" : value.toFixed(2)}<span className="ml-2 text-lg text-neutral-400">°C</span></p>
            <p className="mt-3 text-xs leading-relaxed text-neutral-400">Fila y columna corresponden al orden original de recepción, incluso si giras la vista.</p>
          </section>
        </aside>
      </div>

      {source === "manual" && <section className="overflow-hidden rounded-2xl border border-black/10 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-black/10 p-5 sm:p-6">
          <div><h2 className="text-lg font-medium">Cargar una lectura</h2><p className="mt-1 text-sm text-neutral-500">Pega un bloque de 8 × 8, un arreglo JSON de 64 valores o selecciona un archivo de texto.</p></div>
          <button type="button" className={buttonClass} onClick={clearReading} disabled={!frame && !text}><Eraser className="size-4" aria-hidden="true" />Limpiar</button>
        </div>
        <div className="grid gap-5 p-5 sm:p-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
          <div>
            <label htmlFor="thermal-input" className="text-sm font-medium">Temperaturas recibidas</label>
            <textarea id="thermal-input" value={text} maxLength={16_000} spellCheck={false} onChange={event => { fileRequest.current++; setText(event.target.value); setFileName(null) }} placeholder="Pega aquí un único bloque de temperaturas de la consola o una matriz JSON de 8 × 8." className={`${inputClass} mt-2 min-h-52 resize-y font-mono text-sm leading-relaxed`} />
            {error && <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}{frame ? " Se conserva la lectura cargada anteriormente." : ""}</p>}
          </div>
          <div className="space-y-4">
            <label className="block text-sm font-medium">Unidad de los datos<select value={unit} onChange={event => setUnit(event.target.value as TemperatureUnit)} className={`${inputClass} mt-2`}><option value="celsius">Grados Celsius · salida de consola</option><option value="centicelsius">Centésimas de °C · enteros del driver</option></select></label>
            <p className="text-sm leading-relaxed text-neutral-500">El driver trabaja con centésimas, pero la consola propuesta ya imprime grados Celsius. Elige la unidad del bloque que vas a cargar.</p>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={loadReading} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-black px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"><Check className="size-4" aria-hidden="true" />Visualizar lectura</button>
              <input ref={fileInput} type="file" accept=".json,.txt,.csv,text/plain,application/json,text/csv" onChange={readFile} className="hidden" aria-label="Seleccionar archivo de temperaturas" />
              <button type="button" className={buttonClass} onClick={() => fileInput.current?.click()}><Upload className="size-4" aria-hidden="true" />Abrir archivo</button>
            </div>
            <div role="status" className="rounded-xl bg-neutral-50 p-4 text-sm leading-relaxed text-neutral-500">{frame ? <><p className="font-medium text-black">Lectura cargada localmente</p><p className="mt-1 break-all">{frame.name}</p><p className="mt-1">Hora de carga: {new Date(frame.loadedAt).toLocaleTimeString("es-MX")}</p><p className="mt-2 text-xs">Esta hora indica la carga en el navegador, no la captura del sensor.</p></> : "No hay datos cargados. La página no genera temperaturas de ejemplo."}</div>
          </div>
        </div>
      </section>}
      <p className="max-w-3xl text-sm leading-relaxed text-neutral-500">Esta vista muestra temperaturas, no confirma si una zona corresponde a una persona, un animal o un objeto. Las lecturas en vivo conservan la hora de recepción de la ESP32; cargar un archivo no modifica los datos del sensor.</p>
    </div>
  </div>
}

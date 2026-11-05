import { useEffect, useState } from "react"
import { Activity, ArrowDownToLine, ArrowRight, Clock3, Database, LocateFixed, Radio, RefreshCw, Signal, Target, Wifi } from "lucide-react"
import { RadarView } from "@/components/radar-view"
import { targetColors } from "@/lib/radar-colors"
import { useTelemetry } from "@/hooks/use-telemetry"
import { ageLabel, formatTime, getReadingState } from "@/lib/telemetry"

function ConnectionBadge({ label, value, tone }: { label: string; value: string; tone: "good" | "waiting" | "warning" }) {
  const styles = tone === "good" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : tone === "warning" ? "border-amber-200 bg-amber-50 text-amber-900" : "border-black/10 bg-neutral-50 text-neutral-500"
  return <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] ${styles}`}><span className={`size-1.5 rounded-full ${tone === "good" ? "bg-emerald-600" : tone === "warning" ? "bg-amber-500" : "bg-neutral-400"}`} /><span className="font-medium">{label}</span><span>{value}</span></span>
}

function signed(value: number, decimals = 2) { return `${value > 0 ? "+" : ""}${value.toFixed(decimals)}` }

export function DashboardPage() {
  const { deviceId, status, reading, events, activity, loaded, connected, error, serverOffset, retry } = useTelemetry()
  const [clock, setClock] = useState(() => Date.now())
  const [selectedSlot, setSelectedSlot] = useState(1)
  useEffect(() => {
    const timer = window.setInterval(() => setClock(Date.now()), 1_000)
    return () => window.clearInterval(timer)
  }, [])

  const now = clock + serverOffset
  const online = connected && loaded && !error
  const { espOnline, current, sensorOnline } = getReadingState(reading, status, now, online)
  const targets = reading?.valid ? reading.targets : []
  const selected = targets.find((target) => target.slot === selectedSlot) ?? targets[0] ?? null
  const nearest = targets.length ? Math.min(...targets.map((target) => target.distanceM)) : null
  const simulated = reading?.source === "simulated"
  const firebaseLabel = error ? "Error" : !loaded ? "Conectando" : connected ? "Conectado" : "Sin conexión"
  const sensorLabel = reading && !reading.valid ? "Lectura incompleta" : simulated ? "Datos de prueba" : sensorOnline ? "Recibiendo" : reading ? "Sin datos vigentes" : "Esperando lectura"
  const sourceLabel = simulated ? "DATOS SIMULADOS" : reading?.source === "sensor" ? "ORIGEN: SENSOR" : "ESPERANDO DATOS REALES"
  const summary = [
    { icon: Target, label: "Objetivos detectados", value: current ? String(targets.length).padStart(2, "0") : "—", unit: current ? "/ 3" : "", detail: current ? simulated ? "Lectura de prueba" : "En la última lectura vigente" : "Esperando una lectura vigente" },
    { icon: LocateFixed, label: "Objetivo más cercano", value: current && nearest !== null ? nearest.toFixed(2) : "—", unit: current && nearest !== null ? "m" : "", detail: "Distancia calculada con X e Y" },
    { icon: Clock3, label: "Última lectura", value: reading?.updatedAt ? formatTime(reading.updatedAt) : "—", unit: "", detail: ageLabel(reading?.updatedAt ?? null, now) },
    { icon: Activity, label: "Número de muestra", value: reading?.valid ? `#${reading.sequence}` : "—", unit: "", detail: "Secuencia enviada por el dispositivo" },
  ]
  const timeline = [...events, ...activity].sort((a, b) => b.timestamp - a.timestamp).slice(0, 10)

  return (
    <div className="min-h-screen bg-[#f6f6f6] pb-10">
      <section className="border-b border-black/10 bg-white">
        <div className="mx-auto max-w-360 px-5 py-8 lg:px-8 lg:py-10">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <p className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.17em] text-neutral-500"><Radio className="size-3.5" aria-hidden="true" /> Robot 01 · HLK-LD2450</p>
            <span className={`rounded-md border px-2.5 py-1 font-mono text-[10px] tracking-wider ${simulated ? "border-amber-200 bg-amber-50 text-amber-800" : "border-black/10 bg-neutral-50 text-neutral-500"}`}>{sourceLabel}</span>
          </div>
          <h1 className="mt-4 text-3xl font-medium tracking-[-0.045em] sm:text-4xl">Centro de control</h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-neutral-500">Posición y velocidad de los objetivos reportados por el radar. Primera prueba con el robot fijo.</p>
          <div className="mt-6 flex flex-wrap gap-2" aria-label="Estado de las conexiones" aria-live="polite">
            <ConnectionBadge label="Firebase" value={firebaseLabel} tone={online ? "good" : error ? "warning" : "waiting"} />
            <ConnectionBadge label="ESP32" value={espOnline ? "Con reporte vigente" : "Sin reporte reciente"} tone={espOnline ? "good" : "waiting"} />
            <ConnectionBadge label="Radar" value={sensorLabel} tone={sensorOnline ? "good" : simulated || (reading && !reading.valid) ? "warning" : "waiting"} />
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-360 space-y-5 px-5 pt-6 lg:px-8">
        {error ? <div role="alert" className="flex flex-col items-start justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950 sm:flex-row sm:items-center"><p>{error}</p><button type="button" onClick={retry} className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-black px-4 py-2 text-xs font-medium text-white"><RefreshCw className="size-3.5" />Reintentar</button></div>
          : !loaded ? <p role="status" className="rounded-xl border border-black/10 bg-white p-4 text-sm text-neutral-500">Conectando y leyendo la telemetría…</p>
          : !connected ? <p role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">Sin conexión con Firebase. Los datos que permanezcan visibles corresponden a la última lectura recibida.</p>
          : reading?.issue ? <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">{reading.issue} El estado de la detección queda pendiente.</p>
          : !reading ? <p role="status" className="rounded-xl border border-black/10 bg-white p-4 text-sm text-neutral-600">Firebase está conectado. Todavía no hay lecturas del HLK-LD2450 para este robot.</p>
          : simulated ? <p role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">Estos datos son un ejemplo simulado. La conexión con el sensor físico todavía está pendiente.</p>
          : !current ? <p role="status" className="rounded-xl border border-black/10 bg-white p-4 text-sm text-neutral-600">Sin lectura vigente del sensor o sin reporte reciente de la ESP32. El gráfico y la tabla conservan la última muestra como referencia.</p>
          : null}

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Resumen del radar">
          {summary.map(({ icon: Icon, label, value, unit, detail }) => <article key={label} className="rounded-2xl border border-black/10 bg-white p-5"><div className="flex items-center justify-between gap-3 text-neutral-500"><p className="text-xs">{label}</p><Icon className="size-4 shrink-0" aria-hidden="true" /></div><p className="mt-5 font-mono text-3xl font-medium tracking-[-0.06em] tabular-nums">{value}<span className="ml-2 text-sm font-normal tracking-normal text-neutral-400">{unit}</span></p><p className="mt-2 text-[11px] text-neutral-400">{detail}</p></article>)}
        </section>

        <div className="grid items-stretch gap-5 lg:grid-cols-[1.65fr_1fr]">
          <RadarView targets={targets} selectedSlot={selected?.slot ?? null} current={current} onSelect={setSelectedSlot} />
          <aside className="flex flex-col rounded-2xl border border-black/10 bg-white p-5 sm:p-6" aria-label="Detalle del objetivo seleccionado">
            <p className="text-[10px] font-medium uppercase tracking-[0.17em] text-neutral-400">Detalle de la lectura</p>
            <h2 className="mt-2 text-xl font-medium tracking-[-0.035em]">Objetivo seleccionado</h2>
            <div className="mt-5 grid grid-cols-3 gap-2" aria-label="Seleccionar objetivo">
              {[1, 2, 3].map((slot) => {
                const present = targets.some((target) => target.slot === slot)
                return <button key={slot} type="button" disabled={!present} aria-pressed={selected?.slot === slot} onClick={() => setSelectedSlot(slot)} className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-3 text-xs transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black disabled:cursor-default disabled:text-neutral-300 ${selected?.slot === slot ? "border-black bg-neutral-50" : "border-black/10"}`}><span className="size-2 rounded-full" style={{ backgroundColor: present ? targetColors[slot - 1] : "#e5e5e5" }} />T{slot}</button>
              })}
            </div>
            {selected ? <>
              <div className="mt-6 rounded-xl bg-[#121212] p-5 text-white"><p className="text-xs text-white/45">Distancia al sensor</p><p className="mt-4 font-mono text-4xl tracking-[-0.06em]">{selected.distanceM.toFixed(2)}<span className="ml-2 text-base text-white/40">m</span></p><p className="mt-4 text-[11px] text-white/45">T{selected.slot} · {current ? simulated ? "Muestra simulada" : "Lectura vigente" : "Última lectura, pendiente de actualizar"}</p></div>
              <dl className="mt-6 grid grid-cols-2 gap-x-5 gap-y-6 text-sm">
                <div><dt className="text-xs text-neutral-400">Posición X</dt><dd className="mt-2 font-mono">{signed(selected.xMm / 1000)} m</dd></div>
                <div><dt className="text-xs text-neutral-400">Posición Y</dt><dd className="mt-2 font-mono">{signed(selected.yMm / 1000)} m</dd></div>
                <div><dt className="text-xs text-neutral-400">Velocidad reportada</dt><dd className="mt-2 font-mono">{signed(selected.speedCms / 100)} m/s</dd></div>
                <div><dt className="text-xs text-neutral-400">Ángulo calculado</dt><dd className="mt-2 font-mono">{signed(selected.angleDeg, 1)}°</dd></div>
              </dl>
            </> : <div className="my-auto py-12 text-center"><Target className="mx-auto size-8 text-neutral-300" aria-hidden="true" /><p className="mt-4 text-sm font-medium">{current ? "Sin objetivos detectados" : "Esperando lecturas"}</p><p className="mx-auto mt-2 max-w-60 text-xs leading-relaxed text-neutral-400">{current ? "La última trama válida reportó cero objetivos." : "Las coordenadas aparecerán cuando llegue una muestra válida del radar."}</p></div>}
          </aside>
        </div>

        <section className="overflow-hidden rounded-2xl border border-black/10 bg-white">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-black/10 px-5 py-5 sm:px-6"><div><h2 className="text-base font-medium">Lecturas por objetivo</h2><p className="mt-1 text-xs text-neutral-400">Coordenadas respecto al sensor · distancia y ángulo calculados</p></div><span className="rounded-md bg-neutral-100 px-2.5 py-1 font-mono text-[10px] text-neutral-500">{current ? "MUESTRA VIGENTE" : "ÚLTIMA MUESTRA"}</span></div>
          <div className="overflow-x-auto"><table className="w-full min-w-167.5 text-left text-sm"><thead className="border-b border-black/5 text-[10px] uppercase tracking-wider text-neutral-400"><tr>{["Objetivo", "X (m)", "Y (m)", "Distancia (m)", "Ángulo (°)", "Velocidad (m/s)"].map((label) => <th key={label} scope="col" className="px-5 py-3 font-medium">{label}</th>)}</tr></thead><tbody className="divide-y divide-black/5">{[1, 2, 3].map((slot) => {
            const target = targets.find((item) => item.slot === slot)
            return <tr key={slot} className={selected?.slot === slot ? "bg-neutral-50" : ""}><th scope="row" className="px-5 py-4 text-xs font-medium"><span className="inline-flex items-center gap-2"><span className="size-2 rounded-full" style={{ backgroundColor: target ? targetColors[slot - 1] : "#d4d4d4" }} />T{slot}</span>{!target && <span className="ml-2 font-normal text-neutral-400">{reading?.valid ? "Sin objetivo" : "Sin lectura"}</span>}</th>{[target ? signed(target.xMm / 1000) : "—", target ? signed(target.yMm / 1000) : "—", target?.distanceM.toFixed(2) ?? "—", target ? signed(target.angleDeg, 1) : "—", target ? signed(target.speedCms / 100) : "—"].map((value, index) => <td key={index} className="px-5 py-4 font-mono text-xs text-neutral-600">{value}</td>)}</tr>
          })}</tbody></table></div>
        </section>

        <div className="grid items-start gap-5 lg:grid-cols-2">
          <section className="rounded-2xl border border-black/10 bg-white p-5 sm:p-6"><div className="flex items-center justify-between"><h2 className="text-base font-medium">Registro de eventos</h2><Clock3 className="size-4 text-neutral-400" aria-hidden="true" /></div><p className="mt-1 text-xs text-neutral-400">Eventos del dispositivo y actividad de esta sesión web</p><ol className="mt-5 divide-y divide-black/5">{timeline.length === 0 ? <li className="py-5 text-sm text-neutral-400">Todavía no hay eventos registrados.</li> : timeline.map((event) => <li key={event.id} className="flex gap-4 py-4"><time className="shrink-0 pt-0.5 font-mono text-[10px] text-neutral-400" dateTime={new Date(event.timestamp).toISOString()}>{formatTime(event.timestamp)}</time><div><p className="text-xs font-medium">{event.event}<span className="ml-2 text-[10px] font-normal text-neutral-400">{event.source === "web" ? "Web · esta sesión" : event.source === "simulated" ? "Simulado" : "Dispositivo"}</span></p><p className="mt-1 text-[11px] leading-relaxed text-neutral-400">{event.detail}</p></div></li>)}</ol></section>
          <section className="space-y-5"><div className="rounded-2xl border border-black/10 bg-white p-5 sm:p-6"><h2 className="text-base font-medium">Recorrido de los datos</h2><div className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-4 text-xs">{[{ icon: Radio, label: "Radar" }, { icon: Wifi, label: "ESP32" }, { icon: Database, label: "Firebase" }, { icon: ArrowDownToLine, label: "Web" }].map(({ icon: Icon, label }, index) => <div key={label} className="flex items-center gap-3"><span className="inline-flex items-center gap-2"><Icon className="size-4 text-neutral-400" aria-hidden="true" />{label}</span>{index < 3 && <ArrowRight className="size-3 text-neutral-300" aria-hidden="true" />}</div>)}</div><p className="mt-5 text-[11px] leading-relaxed text-neutral-400">La etiqueta de origen distingue las pruebas de los reportes del sensor. Sin una lectura vigente, los indicadores actuales quedan pendientes.</p></div>
            <details className="rounded-2xl border border-black/10 bg-white p-5 sm:p-6"><summary className="cursor-pointer text-sm font-medium">Detalle técnico</summary><dl className="mt-5 grid grid-cols-2 gap-5 text-xs"><div><dt className="text-neutral-400">Dispositivo</dt><dd className="mt-2 font-mono">{deviceId}</dd></div><div><dt className="text-neutral-400">Sensor</dt><dd className="mt-2">HLK-LD2450</dd></div><div><dt className="text-neutral-400">Último reporte ESP32</dt><dd className="mt-2">{formatTime(status.lastSeenAt)}</dd></div><div><dt className="text-neutral-400">Señal WiFi</dt><dd className="mt-2">{status.wifiRssiDbm === null ? "Sin dato" : `${status.wifiRssiDbm} dBm`}</dd></div><div><dt className="text-neutral-400">Firmware ESP32</dt><dd className="mt-2 break-all">{status.firmware ?? "Sin dato"}</dd></div><div><dt className="text-neutral-400">Resolución reportada T{selected?.slot ?? "—"}</dt><dd className="mt-2">{selected ? `${selected.resolutionMm} mm` : "Sin dato"}</dd></div></dl><p className="mt-5 text-[11px] leading-relaxed text-neutral-400">La resolución es un campo del protocolo; no equivale a precisión de posición ni a confianza de clasificación. La velocidad conserva el signo reportado por el radar.</p><div className="mt-4 flex gap-2 border-t border-black/5 pt-4 text-[11px] text-neutral-400"><Signal className="size-3.5 shrink-0" aria-hidden="true" /><span>UART predeterminado: 256000 baudios · 10 tramas/s nominales. La tasa de publicación de la ESP32 puede ser menor.</span></div></details>
          </section>
        </div>
      </div>
    </div>
  )
}

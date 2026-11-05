import { useId } from "react"
import { Radar } from "lucide-react"
import { targetInView } from "@/lib/telemetry"
import { targetColors } from "@/lib/radar-colors"
import type { RadarTarget } from "@/lib/telemetry"

const origin = { x: 400, y: 470 }
const scale = 62

function arc(radius: number) {
  const dx = radius * Math.sin(Math.PI / 3)
  return `M ${origin.x - dx} ${origin.y - radius / 2} A ${radius} ${radius} 0 0 1 ${origin.x + dx} ${origin.y - radius / 2}`
}

export function RadarView({ targets, selectedSlot, current, onSelect }: { targets: RadarTarget[]; selectedSlot: number | null; current: boolean; onSelect: (slot: number) => void }) {
  const clipId = useId()
  const visible = targets.filter(targetInView)
  const outside = targets.length - visible.length
  return (
    <section className="overflow-hidden rounded-2xl border border-black/10 bg-[#121212] text-white">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-5 py-5 sm:px-6">
        <div><h2 className="text-base font-medium">Campo de detección</h2><p className="mt-1 text-xs text-white/45">Vista superior  </p></div>
        <span className="rounded-md border border-white/15 px-2.5 py-1 font-mono text-[10px] tracking-wider text-white/60">{current ? "LECTURA VIGENTE" : targets.length ? "ÚLTIMA LECTURA" : "ESPERANDO DATOS"}</span>
      </div>
      <div className="relative px-2 pt-3 sm:px-5">
        <svg viewBox="0 0 800 550" className="block w-full" role="group" aria-label="Radar frontal en vista espejo, de 6 metros y 120 grados. Los puntos indican los objetivos reportados.">
          <defs><clipPath id={clipId}><path d={`M ${origin.x} ${origin.y} L ${origin.x - 372 * Math.sin(Math.PI / 3)} ${origin.y - 186} A 372 372 0 0 1 ${origin.x + 372 * Math.sin(Math.PI / 3)} ${origin.y - 186} Z`} /></clipPath></defs>
          <g clipPath={`url(#${clipId})`}>
            <rect width="800" height="550" fill="#181818" />
            {Array.from({ length: 13 }, (_, index) => <line key={`x${index}`} x1={origin.x + (index - 6) * scale} y1="60" x2={origin.x + (index - 6) * scale} y2={origin.y} stroke="white" strokeOpacity="0.04" />)}
            {[1, 2, 3, 4, 5, 6].map((metres) => <line key={`y${metres}`} x1="0" y1={origin.y - metres * scale} x2="800" y2={origin.y - metres * scale} stroke="white" strokeOpacity="0.04" />)}
          </g>
          {[1, 2, 3, 4, 5, 6].map((metres) => <g key={metres}><path d={arc(metres * scale)} stroke="white" strokeOpacity={metres === 6 ? "0.35" : "0.12"} fill="none" /><text x={origin.x + 9} y={origin.y - metres * scale + 16} fill="#777" fontSize="11" fontFamily="monospace">{metres} m</text></g>)}
          {[-60, 0, 60].map((angle) => <line key={angle} x1={origin.x} y1={origin.y} x2={origin.x + 372 * Math.sin(angle * Math.PI / 180)} y2={origin.y - 372 * Math.cos(angle * Math.PI / 180)} stroke="white" strokeOpacity={angle === 0 ? "0.15" : "0.25"} strokeDasharray={angle === 0 ? "4 6" : undefined} />)}
          <text x="400" y="65" textAnchor="middle" fill="#999" fontSize="11" letterSpacing="2">FRENTE · Y</text>
          <text x="78" y="307" fill="#777" fontSize="11">+60°</text><text x="692" y="307" fill="#777" fontSize="11">−60°</text>
          {[-4, -2, 0, 2, 4].map((value) => <text key={value} x={origin.x - value * scale} y="526" textAnchor="middle" fill="#777" fontSize="11" fontFamily="monospace">{value > 0 ? "+" : ""}{value} m</text>)}
          <line x1="100" y1="505" x2="700" y2="505" stroke="white" strokeOpacity="0.12" />
          <text x="730" y="529" fill="#777" fontSize="11">X</text>
          {visible.map((target) => {
            // Refleja la vista horizontal; conserva las mediciones originales del sensor.
            const x = origin.x - target.xMm / 1000 * scale
            const y = origin.y - target.yMm / 1000 * scale
            const color = targetColors[target.slot - 1]
            const selected = selectedSlot === target.slot
            return <g key={target.slot} role="button" tabIndex={0} aria-label={`Objetivo ${target.slot}, distancia ${target.distanceM.toFixed(2)} metros${current ? "" : ", última lectura"}`} aria-pressed={selected} className="cursor-pointer outline-none focus-visible:stroke-white" onClick={() => onSelect(target.slot)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onSelect(target.slot) } }} opacity={current ? 1 : 0.5}>
              <title>{`T${target.slot} · ${target.distanceM.toFixed(2)} m`}</title>
              <circle cx={x} cy={y} r="24" fill="transparent" />
              {selected && <line x1={origin.x} y1={origin.y} x2={x} y2={y} stroke={color} strokeOpacity="0.3" strokeDasharray="4 5" />}
              <circle cx={x} cy={y} r={selected ? 18 : 13} fill={color} fillOpacity="0.1" stroke={color} strokeOpacity="0.35" />
              <circle cx={x} cy={y} r="5" fill={color} />
              <text x={x + 23} y={y - 4} fill={color} fontSize="13" fontFamily="monospace">T{target.slot}</text>
              <text x={x + 23} y={y + 13} fill="#b5b5b5" fontSize="11" fontFamily="monospace">{target.distanceM.toFixed(2)} m</text>
            </g>
          })}
          <rect x="382" y="452" width="36" height="36" rx="10" fill="white" />
          <path d="M 392 470 L 408 470 M 400 462 L 400 478" stroke="#121212" strokeWidth="2" />
          <text x="448" y="476" fill="#999" fontSize="10" letterSpacing="1">SENSOR / ROBOT 01</text>
        </svg>
        {targets.length === 0 && <div className="pointer-events-none absolute inset-x-6 top-[40%] text-center"><Radar className="mx-auto size-7 text-white/35" aria-hidden="true" /><p className="mt-3 text-sm text-white/55">{current ? "Sin objetivos en esta lectura" : "Esperando la primera lectura del sensor"}</p></div>}
      </div>
    </section>
  )
}

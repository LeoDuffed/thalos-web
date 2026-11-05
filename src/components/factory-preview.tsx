import { Bot, Radar, Target } from "lucide-react"

export function FactoryPreview() {
  return (
    <div className="overflow-hidden rounded-[1.5rem] border border-black/10 bg-[#121212] text-white shadow-2xl shadow-black/15">
      <div className="flex items-center justify-between border-b border-white/10 px-5 py-3.5">
        <div className="flex items-center gap-2 text-xs text-white/60">
          <span className="signal-pulse size-2 rounded-full bg-white" />
          VISTA ILUSTRATIVA
        </div>
        <span className="font-mono text-xs text-white/40">PROTOTIPO 01</span>
      </div>
      <div className="factory-grid relative aspect-[1.16] min-h-[360px] overflow-hidden">
        <div className="absolute inset-x-[12%] top-[18%] h-px bg-white/10" />
        <div className="absolute inset-x-[12%] bottom-[22%] h-px bg-white/10" />
        <div className="absolute inset-y-[12%] left-[23%] w-px bg-white/10" />
        <div className="absolute inset-y-[12%] right-[28%] w-px bg-white/10" />
        <div className="absolute left-[9%] top-[11%] rounded-md border border-white/10 bg-white/5 px-3 py-2 text-[10px] tracking-widest text-white/35">
          RADAR FIJO
        </div>
        <div className="absolute bottom-[9%] right-[9%] rounded-md border border-white/10 bg-white/5 px-3 py-2 text-[10px] tracking-widest text-white/35">
          ESP32 · WIFI
        </div>
        <div className="absolute left-[26%] top-[38%]">
          <div className="radar-wave absolute -inset-12 rounded-full border border-white/15" />
          <div className="radar-wave radar-wave-delay absolute -inset-8 rounded-full border border-white/20" />
          <div className="relative grid size-12 place-items-center rounded-xl bg-white text-black shadow-lg">
            <Bot className="size-6" />
          </div>
          <span className="mt-2 block text-center font-mono text-[10px] text-white/50">ROBOT 01</span>
        </div>
        <div className="absolute right-[31%] top-[25%] flex flex-col items-center">
          <div className="relative grid size-10 place-items-center rounded-full border border-white bg-white/10">
            <Target className="size-5" />
            <span className="absolute -inset-2 rounded-full border border-white/20" />
          </div>
          <span className="mt-2 rounded bg-white px-2 py-1 font-mono text-[9px] font-medium text-black">
            OBJETIVO T1
          </span>
        </div>
        <div className="absolute bottom-5 left-5 right-5 flex items-center gap-3 rounded-xl border border-white/10 bg-black/70 p-3 backdrop-blur-md">
          <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-white text-black">
            <Radar className="size-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-3">
              <p className="truncate text-xs font-medium">Lecturas del HLK-LD2450</p>
            </div>
            <p className="mt-1 text-[11px] text-white/50">Posición · Distancia · Velocidad</p>
          </div>
        </div>
      </div>
    </div>
  )
}

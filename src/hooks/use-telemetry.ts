import { useEffect, useState } from "react"
import { limitToLast, onValue, orderByChild, query, ref } from "firebase/database"
import { authenticateReader } from "@/lib/firebase"
import { parseDeviceStatus, parseEvents, parseRadarReading } from "@/lib/telemetry"
import type { DeviceStatus, RadarReading, TelemetryEvent } from "@/lib/telemetry"

type TelemetryState = {
  deviceId: string; status: DeviceStatus; reading: RadarReading | null
  events: TelemetryEvent[]; activity: TelemetryEvent[]
  loaded: boolean; connected: boolean; error: string | null; serverOffset: number
}

function errorMessage(error: unknown): string {
  const code = typeof error === "object" && error !== null && "code" in error ? String(error.code) : ""
  if (code.startsWith("app/") && error instanceof Error) return error.message
  if (["operation-not-allowed", "admin-restricted-operation", "configuration-not-found"].some((part) => code.includes(part))) return "Activa el proveedor Anónimo en Firebase → Authentication → Método de acceso."
  if (code.toLowerCase().includes("permission_denied") || code.toLowerCase().includes("permission-denied")) return "Firebase rechazó la lectura. Comprueba las reglas de lectura de telemetry en Realtime Database."
  if (code.includes("network-request-failed")) return "No se pudo contactar a Firebase. Comprueba internet y vuelve a intentar."
  return `No se pudo leer Firebase${code ? ` (${code})` : ""}. Vuelve a intentar la conexión.`
}

function withActivity(state: TelemetryState, event: string, detail: string): TelemetryState {
  const timestamp = Date.now() + state.serverOffset
  return { ...state, activity: [{ id: `web-${timestamp}-${state.activity.length}`, timestamp, event, detail, source: "web" as const }, ...state.activity].slice(0, 30) }
}

export function useTelemetry() {
  const [attempt, setAttempt] = useState(0)
  const [state, setState] = useState<TelemetryState>({ deviceId: "robot-01", status: parseDeviceStatus(null), reading: null, events: [], activity: [], loaded: false, connected: false, error: null, serverOffset: 0 })

  useEffect(() => {
    let active = true
    let failed = false
    const unsubscribers: (() => void)[] = []
    const ready = new Set<string>()

    function fail(error: unknown) {
      if (!active) return
      failed = true
      setState((previous) => ({ ...previous, error: errorMessage(error), connected: false }))
    }

    async function subscribe() {
      try {
        const { database, deviceId } = await authenticateReader()
        if (!active) return
        setState((previous) => ({ ...previous, deviceId, loaded: false, connected: false, error: null }))
        unsubscribers.push(onValue(ref(database, ".info/connected"), (snapshot) => {
          if (!active || failed) return
          const connected = snapshot.val() === true
          setState((previous) => previous.connected === connected ? previous : withActivity({ ...previous, connected }, connected ? "Firebase conectado" : "Conexión interrumpida", connected ? "Lectura de telemetría disponible." : "Se conservan las últimas lecturas como historial."))
        }))
        unsubscribers.push(onValue(ref(database, ".info/serverTimeOffset"), (snapshot) => {
          const offset: unknown = snapshot.val()
          if (active && !failed && typeof offset === "number" && Number.isFinite(offset)) setState((previous) => ({ ...previous, serverOffset: offset }))
        }))

        const base = `telemetry/devices/${deviceId}`
        const sources = [
          { key: "status", source: ref(database, `${base}/status`), parse: parseDeviceStatus },
          { key: "reading", source: ref(database, `${base}/sensors/ld2450`), parse: parseRadarReading },
          { key: "events", source: query(ref(database, "telemetry/events"), orderByChild("timestamp"), limitToLast(50)), parse: (value: unknown) => parseEvents(value, deviceId) },
        ] as const

        for (const { key, source, parse } of sources) {
          unsubscribers.push(onValue(source, (snapshot) => {
            if (!active || failed) return
            ready.add(key)
            const result = parse(snapshot.val())
            setState((previous) => {
              const next = { ...previous, [key]: result, loaded: ready.size === sources.length }
              if (key !== "reading") return next
              const reading = result as RadarReading | null
              if (reading?.valid && !previous.reading?.valid) return withActivity(next, "Lectura de radar recibida", reading.source === "simulated" ? "Ejemplo simulado, sin medición física." : "Primera lectura válida recibida en esta sesión.")
              if (reading?.valid && previous.reading?.valid && reading.targets.length !== previous.reading.targets.length) return withActivity(next, "Cambio de objetivos", `${previous.reading.targets.length} → ${reading.targets.length} objetivos${reading.source === "simulated" ? " · Simulado" : ""}.`)
              return next
            })
          }, fail))
        }
      } catch (error) { fail(error) }
    }

    void subscribe()
    return () => { active = false; unsubscribers.forEach((unsubscribe) => unsubscribe()) }
  }, [attempt])

  return { ...state, retry: () => setAttempt((previous) => previous + 1) }
}

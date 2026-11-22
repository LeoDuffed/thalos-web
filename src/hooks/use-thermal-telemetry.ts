import { useEffect, useState } from "react"
import { onValue, ref } from "firebase/database"
import { authenticateReader } from "@/lib/firebase"
import { parseDeviceStatus } from "@/lib/telemetry"
import type { DeviceStatus } from "@/lib/telemetry"
import { parseThermalReading } from "@/lib/thermal"
import type { ThermalReading } from "@/lib/thermal"

type State = {
  reading: ThermalReading | null; status: DeviceStatus; deviceId: string
  connected: boolean; loaded: boolean; serverOffset: number; error: string | null
}

function connectionError(cause: unknown) {
  const code = typeof cause === "object" && cause !== null && "code" in cause ? String(cause.code) : ""
  if (code.startsWith("app/") && cause instanceof Error) return cause.message
  if (/permission.denied/i.test(code)) return "Firebase rechazó la lectura. Comprueba las reglas de Realtime Database."
  if (code.includes("operation-not-allowed") || code.includes("admin-restricted-operation")) return "Habilita el acceso Anónimo de Firebase Authentication para la web."
  return "No se pudo leer la matriz desde Firebase. Comprueba la conexión y vuelve a intentar."
}

export function useThermalTelemetry(enabled: boolean) {
  const [attempt, setAttempt] = useState(0)
  const [state, setState] = useState<State>({ reading: null, status: parseDeviceStatus(null), deviceId: "robot-01", connected: false, loaded: false, serverOffset: 0, error: null })

  useEffect(() => {
    if (!enabled) return
    let active = true
    let failed = false
    const ready = new Set<string>()
    const unsubscribers: (() => void)[] = []
    function fail(cause: unknown) {
      if (!active) return
      failed = true
      setState(previous => ({ ...previous, connected: false, loaded: true, error: connectionError(cause) }))
    }
    async function subscribe() {
      try {
        const { database, deviceId } = await authenticateReader()
        if (!active) return
        setState(previous => ({ ...previous, deviceId, connected: false, loaded: false, error: null }))
        unsubscribers.push(onValue(ref(database, ".info/connected"), snapshot => {
          if (active && !failed) setState(previous => ({ ...previous, connected: snapshot.val() === true }))
        }, fail))
        unsubscribers.push(onValue(ref(database, ".info/serverTimeOffset"), snapshot => {
          const offset: unknown = snapshot.val()
          if (active && !failed && typeof offset === "number" && Number.isFinite(offset)) setState(previous => ({ ...previous, serverOffset: offset }))
        }, fail))
        const base = `telemetry/devices/${deviceId}`
        unsubscribers.push(onValue(ref(database, `${base}/status`), snapshot => {
          if (!active || failed) return
          ready.add("status")
          setState(previous => ({ ...previous, status: parseDeviceStatus(snapshot.val()), loaded: ready.size === 2 }))
        }, fail))
        unsubscribers.push(onValue(ref(database, `${base}/sensors/amg8831`), snapshot => {
          if (!active || failed) return
          ready.add("thermal")
          const raw: unknown = snapshot.val()
          const reading = parseThermalReading(raw)
          setState(previous => ({ ...previous, reading, loaded: ready.size === 2, error: raw !== null && !reading ? "La matriz recibida está incompleta o no coincide con el formato de 64 temperaturas." : null }))
        }, fail))
      } catch (cause) { fail(cause) }
    }
    void subscribe()
    return () => { active = false; unsubscribers.forEach(unsubscribe => unsubscribe()) }
  }, [enabled, attempt])

  return { ...state, retry: () => setAttempt(previous => previous + 1) }
}

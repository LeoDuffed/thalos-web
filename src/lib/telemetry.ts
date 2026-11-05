export type RadarTarget = {
  slot: number; xMm: number; yMm: number; speedCms: number; resolutionMm: number
  distanceM: number; angleDeg: number
}
export type RadarReading = {
  source: "sensor" | "simulated" | "unknown"
  updatedAt: number | null; sequence: number | null
  targets: RadarTarget[]; valid: boolean; issue: string | null
}
export type DeviceStatus = { lastSeenAt: number | null; firmware: string | null; wifiRssiDbm: number | null }
export type TelemetryEvent = { id: string; timestamp: number; event: string; detail: string; source: "sensor" | "simulated" | "web" }

export const ESP_TIMEOUT_MS = 15_000
export const SENSOR_TIMEOUT_MS = 5_000
const MAX_TIMESTAMP_MS = 8_640_000_000_000_000

function object(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}
}
function numeric(value: unknown, min: number, max: number, integer = false): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= min && value <= max && (!integer || Number.isInteger(value)) ? value : null
}
function timestamp(value: unknown) { return numeric(value, 1, MAX_TIMESTAMP_MS, true) }
function text(value: unknown, fallback: string | null = null) { return typeof value === "string" && value.trim() ? value.slice(0, 200) : fallback }

export function parseDeviceStatus(value: unknown): DeviceStatus {
  const data = object(value)
  return { lastSeenAt: timestamp(data.lastSeenAt), firmware: text(data.firmware), wifiRssiDbm: numeric(data.wifiRssiDbm, -127, 0) }
}

export function parseRadarReading(value: unknown): RadarReading | null {
  if (value === null || value === undefined) return null
  const data = object(value)
  const targets: RadarTarget[] = []
  let malformed = false
  const entries = data.targets !== null && typeof data.targets === "object" ? Object.entries(data.targets) : []
  if (data.targets != null && typeof data.targets !== "object") malformed = true
  for (const [key, raw] of entries) {
    if (raw == null) continue // Numeric Firebase keys can be returned as a sparse array.
    const target = object(raw)
    if (target.active === false) continue
    const slot = Number(key)
    const xMm = numeric(target.xMm, -32767, 32767, true)
    const yMm = numeric(target.yMm, -32767, 32767, true)
    const speedCms = numeric(target.speedCms, -32767, 32767, true)
    const resolutionMm = numeric(target.resolutionMm, 0, 65535, true)
    if (target.active !== true || ![1, 2, 3].includes(slot) || xMm === null || yMm === null || speedCms === null || resolutionMm === null || (xMm === 0 && yMm === 0 && speedCms === 0 && resolutionMm === 0)) {
      malformed = true; continue
    }
    targets.push({ slot, xMm, yMm, speedCms, resolutionMm, distanceM: Math.hypot(xMm, yMm) / 1000, angleDeg: Math.atan2(xMm, yMm) * 180 / Math.PI })
  }
  targets.sort((a, b) => a.slot - b.slot)
  const count = numeric(data.targetCount, 0, 3, true)
  const updatedAt = timestamp(data.updatedAt)
  const sequence = numeric(data.sequence, 0, Number.MAX_SAFE_INTEGER, true)
  const valid = data.model === "HLK-LD2450" && updatedAt !== null && sequence !== null && count !== null && count === targets.length && !malformed && new Set(targets.map((target) => target.slot)).size === targets.length
  return { source: data.source === "sensor" || data.source === "simulated" ? data.source : "unknown", updatedAt, sequence, targets, valid, issue: valid ? null : "La lectura está incompleta o no coincide con el formato del HLK-LD2450." }
}

export function parseEvents(value: unknown, deviceId: string): TelemetryEvent[] {
  return Object.entries(object(value)).flatMap(([id, raw]) => {
    const data = object(raw)
    const time = timestamp(data.timestamp)
    if (data.deviceId !== deviceId || time === null) return []
    return [{ id, timestamp: time, event: text(data.event, "Reporte recibido")!, detail: text(data.detail, "")!, source: data.source === "simulated" ? "simulated" as const : "sensor" as const }]
  }).sort((a, b) => b.timestamp - a.timestamp).slice(0, 50)
}

export function isRecent(time: number | null, now: number, timeout = SENSOR_TIMEOUT_MS) {
  return time !== null && time <= now + 2_000 && now - time <= timeout
}
export function getReadingState(reading: RadarReading | null, status: DeviceStatus, now: number, connected: boolean) {
  const espOnline = connected && isRecent(status.lastSeenAt, now, ESP_TIMEOUT_MS)
  const fresh = connected && reading?.valid === true && isRecent(reading.updatedAt, now)
  const current = fresh && (reading.source === "simulated" || (reading.source === "sensor" && espOnline))
  return { espOnline, fresh, current, sensorOnline: current && reading?.source === "sensor" }
}
export function targetInView(target: RadarTarget) { return target.yMm >= 0 && target.distanceM <= 6 && Math.abs(target.angleDeg) <= 60 }
export function formatTime(time: number | null) { return time === null ? "Sin reporte" : new Date(time).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) }
export function ageLabel(time: number | null, now: number) {
  if (time === null) return "Sin reporte"
  const seconds = Math.max(0, Math.floor((now - time) / 1000))
  if (seconds < 1) return "Ahora"
  if (seconds < 60) return `Hace ${seconds} s`
  if (seconds < 3600) return `Hace ${Math.floor(seconds / 60)} min`
  return `Hace ${Math.floor(seconds / 3600)} h`
}

export const THERMAL_SIZE = 8
export const THERMAL_PIXELS = THERMAL_SIZE * THERMAL_SIZE
export type TemperatureUnit = "celsius" | "centicelsius"
export type ColorRange = { min: number; max: number }
export type ThermalStats = { min: number; max: number; average: number; hottestIndex: number }

// los colores solo indican temperatura dentro de la escala, no identifican personas
export const thermalPalette = ["#253494", "#246bcb", "#22b8c5", "#f4dc69", "#ef8835", "#cc304c"]
export const thermalGradient = `linear-gradient(to right, ${thermalPalette.join(", ")})`

export function parseThermalInput(input: string, unit: TemperatureUnit): number[] {
  if (!input.trim()) throw new Error("Pega una lectura o selecciona un archivo antes de cargarla.")
  if (input.length > 16_000) throw new Error("Carga solo una lectura de 64 temperaturas por vez.")
  // aceptamos un arreglo JSON o el bloque que imprimirá la tarea térmica en la consola
  const header = /^AMG8831\s*-\s*grados C:\s*/i
  if (header.test(input.trim()) && unit !== "celsius") throw new Error("El encabezado indica grados Celsius. Selecciona esa unidad antes de visualizar la lectura.")
  const content = input.trim().replace(header, "")
  let values: unknown[]
  if (content.startsWith("[")) {
    let parsed: unknown
    try { parsed = JSON.parse(content) } catch { throw new Error("El JSON está incompleto. Usa un arreglo de 64 valores o una matriz de 8 × 8.") }
    if (!Array.isArray(parsed)) throw new Error("La lectura debe ser un arreglo.")
    if (parsed.some(Array.isArray)) {
      if (parsed.length !== 8 || parsed.some(row => !Array.isArray(row) || row.length !== 8)) throw new Error("La matriz debe tener exactamente 8 filas de 8 temperaturas.")
      values = parsed.flat()
    } else values = parsed
  } else {
    const tokens = content.split(/[\s,;]+/).filter(Boolean)
    if (tokens.some(token => !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(token))) {
      throw new Error("Pega solo las 64 temperaturas de un bloque. No incluyas mensajes de otros sensores. Usa punto decimal.")
    }
    values = tokens.map(Number)
  }
  if (values.length !== THERMAL_PIXELS) throw new Error(`Se recibieron ${values.length} valores. La AMG8831 necesita exactamente 64.`)
  if (values.some(value => typeof value !== "number" || !Number.isFinite(value))) throw new Error("Cada píxel debe contener una temperatura numérica válida; no se aceptan valores vacíos.")
  if (unit === "centicelsius" && values.some(value => !Number.isInteger(value))) throw new Error("En centésimas de °C, el driver entrega enteros. Revisa la unidad de los datos.")
  const pixels = (values as number[]).map(value => unit === "centicelsius" ? value / 100 : value)
  // este límite detecta errores de unidad o de transmisión, no es una calibración del sensor
  if (pixels.some(value => value < -273.15 || value > 1000)) throw new Error("Hay temperaturas fuera de rango. Revisa si los datos están en °C o en centésimas de °C.")
  return pixels
}

export function thermalStats(pixels: number[]): ThermalStats {
  const min = Math.min(...pixels)
  const max = Math.max(...pixels)
  return { min, max, average: pixels.reduce((sum, value) => sum + value, 0) / pixels.length, hottestIndex: pixels.indexOf(max) }
}

export function automaticRange(stats: ThermalStats): ColorRange {
  // si todos los píxeles son iguales dejamos un margen, para no dibujarlos como un máximo caliente
  const center = (stats.min + stats.max) / 2
  return stats.max - stats.min < 1 ? { min: center - 0.5, max: center + 0.5 } : { min: stats.min, max: stats.max }
}

export function readManualRange(min: string, max: string): ColorRange | null {
  if (!min.trim() || !max.trim()) return null
  const low = Number(min)
  const high = Number(max)
  return Number.isFinite(low) && Number.isFinite(high) && Number.isFinite(high - low) && low < high ? { min: low, max: high } : null
}

export function thermalColor(value: number, range: ColorRange) {
  const position = Math.max(0, Math.min(1, (value - range.min) / (range.max - range.min)))
  const scaled = position * (thermalPalette.length - 1)
  const index = Math.min(Math.floor(scaled), thermalPalette.length - 2)
  const fraction = scaled - index
  const rgb = [0, 1, 2].map(channel => {
    const start = parseInt(thermalPalette[index].slice(1 + channel * 2, 3 + channel * 2), 16)
    const end = parseInt(thermalPalette[index + 1].slice(1 + channel * 2, 3 + channel * 2), 16)
    return Math.round(start + (end - start) * fraction)
  })
  const light = rgb.reduce((sum, channel, index) => {
    const value = channel / 255
    const linear = value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
    return sum + linear * [0.2126, 0.7152, 0.0722][index]
  }, 0)
  return { background: `rgb(${rgb.join(", ")})`, foreground: light > 0.179 ? "#000000" : "#ffffff" }
}

// girar o reflejar cambia la vista; cada píxel conserva su índice y su valor original
export function displayPixelIndex(row: number, col: number, turns: number, mirrored: boolean) {
  let r = row
  let c = mirrored ? THERMAL_SIZE - 1 - col : col
  for (let i = 0; i < ((turns % 4) + 4) % 4; i++) [r, c] = [THERMAL_SIZE - 1 - c, r]
  return r * THERMAL_SIZE + c
}


export type ThermalReading = { pixels: number[]; updatedAt: number; sequence: number }
export const THERMAL_TIMEOUT_MS = 5_000

// Firebase puede representar indices numericos como arreglo o como objeto.
// Se requieren los 64 indices, incluidos los que contienen un cero real.
export function parseThermalReading(value: unknown): ThermalReading | null {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return null
  const data = value as Record<string, unknown>
  if (data.model !== "AMG8831" || data.source !== "sensor" || data.unit !== "centicelsius" || data.width !== 8 || data.height !== 8) return null
  if (typeof data.updatedAt !== "number" || !Number.isSafeInteger(data.updatedAt) || data.updatedAt < 1 || data.updatedAt > 8_640_000_000_000_000) return null
  if (typeof data.sequence !== "number" || !Number.isInteger(data.sequence) || data.sequence < 0 || data.sequence > 4_294_967_295) return null
  if (data.pixels === null || typeof data.pixels !== "object") return null
  const raw = data.pixels as Record<string, unknown>
  if (Object.keys(raw).length !== THERMAL_PIXELS) return null
  const pixels: number[] = []
  for (let index = 0; index < THERMAL_PIXELS; index++) {
    if (!Object.hasOwn(raw, String(index))) return null
    const pixel = raw[index]
    if (typeof pixel !== "number" || !Number.isInteger(pixel) || pixel < -51200 || pixel > 51175) return null
    pixels.push(pixel / 100)
  }
  return { pixels, updatedAt: data.updatedAt, sequence: data.sequence }
}

export function getThermalReadingState(reading: ThermalReading | null, lastSeenAt: number | null, now: number, connected: boolean) {
  const recent = (timestamp: number | null, limit: number) => timestamp !== null && timestamp <= now + 2_000 && now - timestamp <= limit
  const espOnline = connected && recent(lastSeenAt, 15_000)
  const fresh = connected && reading !== null && recent(reading.updatedAt, THERMAL_TIMEOUT_MS)
  return { espOnline, fresh, current: espOnline && fresh }
}

import test from "node:test"
import assert from "node:assert/strict"
import { parseThermalReading, getThermalReadingState } from "../src/lib/thermal.ts"

const timestamp = 1_800_000_000_000
const pixels = Array.from({ length: 64 }, (_, index) => index === 0 ? -25 : 2000 + index * 25)
const payload = (changes = {}) => ({ model: "AMG8831", source: "sensor", unit: "centicelsius", width: 8, height: 8, updatedAt: timestamp, sequence: 8, pixels: [...pixels], ...changes })

test("recibe los 64 pixeles de Firebase y convierte centesimas una sola vez", () => {
  const reading = parseThermalReading(payload())
  assert.deepEqual(reading.pixels, pixels.map(value => value / 100))
  assert.equal(reading.updatedAt, timestamp)
  assert.equal(reading.sequence, 8)
  assert.deepEqual(parseThermalReading(payload({ pixels: Object.fromEntries(pixels.map((value, index) => [index, value])) })), reading)
  assert.deepEqual(parseThermalReading(payload({ pixels: Array(64).fill(0) })).pixels, Array(64).fill(0))
})

test("no muestra cuadros incompletos, valores simulados ni formatos ambiguos", () => {
  const missing = { ...Object.fromEntries(pixels.map((value, index) => [index, value])) }
  delete missing[10]
  const hole = [...pixels]
  delete hole[10]
  const extra = Object.fromEntries(pixels.map((value, index) => [index, value]))
  extra["01"] = 2500
  for (const value of [null, {}, [], payload({ pixels: pixels.slice(1) }), payload({ pixels: [...pixels, 2500] }), payload({ pixels: missing }), payload({ pixels: hole }), payload({ pixels: extra }), payload({ pixels: null }), payload({ model: "other" }), payload({ source: "simulated" }), payload({ unit: "celsius" }), payload({ width: 7 }), payload({ sequence: -1 }), payload({ sequence: 4294967296 }), payload({ updatedAt: NaN }), payload({ updatedAt: 0 })]) {
    assert.equal(parseThermalReading(value), null)
  }
  for (const value of [null, "2500", true, NaN, Infinity, 2500.5, -51201, 51176]) {
    assert.equal(parseThermalReading(payload({ pixels: [value, ...pixels.slice(1)] })), null)
  }
})

test("un heartbeat nuevo no hace vigente una matriz antigua", () => {
  const reading = parseThermalReading(payload())
  assert.equal(getThermalReadingState(reading, timestamp, timestamp + 1000, true).current, true)
  const stale = getThermalReadingState(reading, timestamp + 6000, timestamp + 6000, true)
  assert.equal(stale.espOnline, true)
  assert.equal(stale.fresh, false)
  assert.equal(stale.current, false)
  assert.equal(getThermalReadingState(reading, timestamp, timestamp + 1000, false).current, false)
  assert.equal(getThermalReadingState(reading, timestamp - 16000, timestamp, true).current, false)
  assert.equal(getThermalReadingState(reading, timestamp, timestamp - 2001, true).current, false)
  assert.equal(getThermalReadingState(null, timestamp, timestamp, true).current, false)
})

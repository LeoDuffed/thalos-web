import test from "node:test"
import assert from "node:assert/strict"
import { parseThermalInput, thermalStats, automaticRange, readManualRange, displayPixelIndex, thermalColor } from "../src/lib/thermal.ts"

// las muestras de estas pruebas nunca se cargan a la página ni a Firebase
const pixels = Array.from({ length: 64 }, (_, index) => 20 + index / 4)
const rows = Array.from({ length: 8 }, (_, row) => pixels.slice(row * 8, row * 8 + 8))

test("interpreta el bloque de la consola y conserva el orden de sus 64 temperaturas", () => {
  const text = "AMG8831 - grados C:\r\n" + rows.map(row => row.join(" ")).join("\r\n")
  assert.deepEqual(parseThermalInput(text, "celsius"), pixels)
  assert.deepEqual(parseThermalInput(JSON.stringify(rows), "celsius"), pixels)
  assert.deepEqual(parseThermalInput(JSON.stringify(pixels), "celsius"), pixels)
})

test("convierte centésimas de manera explícita y evita reinterpretar un encabezado en Celsius", () => {
  assert.deepEqual(parseThermalInput(JSON.stringify(pixels.map(value => value * 100)), "centicelsius"), pixels)
  assert.throws(() => parseThermalInput("AMG8831 - grados C:\n" + pixels.join(" "), "centicelsius"), /Celsius/)
  assert.throws(() => parseThermalInput(JSON.stringify(pixels), "centicelsius"), /enteros/)
  const signed = [-1.25, ...pixels.slice(1)]
  assert.deepEqual(parseThermalInput(signed.join(";"), "celsius"), signed)
})

test("no acepta cuadros incompletos, varias lecturas ni mensajes de otros sensores", () => {
  for (const input of ["", "[]", pixels.slice(1).join(" "), [...pixels, ...pixels].join(" "), JSON.stringify([pixels.slice(0, 32), pixels.slice(32)]), "VL1=50 " + pixels.join(" "), "[incompleto]"]) {
    assert.throws(() => parseThermalInput(input, "celsius"))
  }
})

test("rechaza valores no numéricos y errores de unidad sin inventar ceros", () => {
  for (const value of [null, "25", true, {}, [1], 1e200]) {
    assert.throws(() => parseThermalInput(JSON.stringify([value, ...pixels.slice(1)]), "celsius"))
  }
  assert.throws(() => parseThermalInput("NaN " + pixels.slice(1).join(" "), "celsius"))
  assert.throws(() => parseThermalInput("x".repeat(16001), "celsius"))
  assert.deepEqual(parseThermalInput(JSON.stringify(Array(64).fill(0)), "celsius"), Array(64).fill(0))
})

test("calcula extremos y media usando todos los píxeles", () => {
  const stats = thermalStats(pixels)
  assert.equal(stats.min, 20)
  assert.equal(stats.max, 35.75)
  assert.equal(stats.average, 27.875)
  assert.equal(stats.hottestIndex, 63)
})

test("la escala automática no convierte una matriz uniforme en un máximo caliente", () => {
  assert.deepEqual(automaticRange(thermalStats(Array(64).fill(25))), { min: 24.5, max: 25.5 })
  const range = automaticRange(thermalStats([25, 25.75]))
  assert.ok(range.min <= 25 && range.max >= 25.75)
  for (const values of [["", "40"], ["40", "20"], ["20", "20"], ["abc", "40"], ["-1e308", "1e308"]]) assert.equal(readManualRange(...values), null)
})

test("cada giro y reflejo conserva los 64 píxeles sin duplicar ni perder mediciones", () => {
  for (let turns = 0; turns < 4; turns++) {
    for (const mirror of [false, true]) {
      const indices = Array.from({ length: 64 }, (_, index) => displayPixelIndex(Math.floor(index / 8), index % 8, turns, mirror))
      assert.deepEqual([...indices].sort((a, b) => a - b), Array.from({ length: 64 }, (_, index) => index))
    }
  }
  assert.equal(displayPixelIndex(0, 0, 1, false), 56)
  assert.equal(displayPixelIndex(0, 0, 0, true), 7)
  assert.equal(displayPixelIndex(3, 2, 4, false), 26)
})

test("los colores saturan fuera de la escala sin cambiar la temperatura original", () => {
  const range = { min: 20, max: 40 }
  assert.deepEqual(thermalColor(10, range), thermalColor(20, range))
  assert.deepEqual(thermalColor(70, range), thermalColor(40, range))
  assert.notEqual(thermalColor(20, range).background, thermalColor(40, range).background)
  assert.equal(thermalColor(20, range).foreground, "#ffffff")
})

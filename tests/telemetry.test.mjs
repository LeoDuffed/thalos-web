import test from "node:test"
import assert from "node:assert/strict"
import { parseRadarReading, parseDeviceStatus, parseEvents, getReadingState, targetInView, ESP_TIMEOUT_MS, SENSOR_TIMEOUT_MS } from "../src/lib/telemetry.ts"
import { readFirebaseConfig, readDeviceId } from "../src/lib/firebase-config.ts"

const now = 1_800_000_000_000
const target = { active: true, xMm: -782, yMm: 1713, speedCms: -16, resolutionMm: 320 }
function frame(overrides = {}) { return { model: "HLK-LD2450", source: "sensor", sequence: 42, updatedAt: now, targetCount: 1, targets: { 1: target }, ...overrides } }
const status = parseDeviceStatus({ lastSeenAt: now })

test("a missing reading is different from a valid zero-target frame", () => {
  assert.equal(parseRadarReading(null), null)
  const reading = parseRadarReading(frame({ targetCount: 0, targets: null }))
  assert.equal(reading.valid, true)
  assert.equal(reading.targets.length, 0)
  assert.equal(getReadingState(reading, status, now, true).sensorOnline, true)
})

test("the manufacturer's sample preserves signed coordinates, speed and resolution", () => {
  const reading = parseRadarReading(frame())
  assert.equal(reading.valid, true)
  assert.equal(reading.targets[0].xMm, -782)
  assert.equal(reading.targets[0].speedCms, -16)
  assert.equal(reading.targets[0].resolutionMm, 320)
  assert.ok(Math.abs(reading.targets[0].distanceM - 1.883) < 0.002)
  assert.ok(reading.targets[0].angleDeg < 0)
})

test("Firebase sparse slot arrays and inactive slots are supported", () => {
  const reading = parseRadarReading(frame({ targets: [null, target, { active: false }] }))
  assert.equal(reading.valid, true)
  assert.deepEqual(reading.targets.map((item) => item.slot), [1])
})

test("incomplete, impossible, or mismatched fields never become an empty valid reading", () => {
  for (const patch of [{ targetCount: 0 }, { updatedAt: 1e100 }, { sequence: -1 }, { targets: { 1: { ...target, xMm: "-782" } } }, { targets: { 1: { ...target, speedCms: 1.5 } } }, { targets: { 1: { active: true, xMm: 0, yMm: 0, speedCms: 0, resolutionMm: 0 } } }, { targetCount: 4 }, { targets: "wrong" }, { model: "different" }]) {
    assert.equal(parseRadarReading(frame(patch)).valid, false)
  }
})

test("each of the three radar slots is accepted without a persistent person identity", () => {
  const reading = parseRadarReading(frame({ targetCount: 3, targets: { 3: target, 1: target, 2: target } }))
  assert.equal(reading.valid, true)
  assert.deepEqual(reading.targets.map((item) => item.slot), [1, 2, 3])
})

test("stale ESP and radar timestamps and a disconnected database have independent effects", () => {
  const reading = parseRadarReading(frame())
  assert.equal(getReadingState(reading, status, now, true).sensorOnline, true)
  assert.equal(getReadingState(reading, status, now + SENSOR_TIMEOUT_MS + 1, true).espOnline, true)
  assert.equal(getReadingState(reading, status, now + SENSOR_TIMEOUT_MS + 1, true).sensorOnline, false)
  assert.equal(getReadingState(reading, status, now + ESP_TIMEOUT_MS + 1, true).espOnline, false)
  assert.equal(getReadingState(reading, status, now, false).current, false)
  assert.equal(getReadingState(reading, parseDeviceStatus(null), now, true).current, false)
})

test("simulated data never declares a physical sensor online", () => {
  const reading = parseRadarReading(frame({ source: "simulated" }))
  const state = getReadingState(reading, parseDeviceStatus(null), now, true)
  assert.equal(state.current, true)
  assert.equal(state.espOnline, false)
  assert.equal(state.sensorOnline, false)
})

test("unknown source and future timestamps cannot be presented as current real data", () => {
  assert.equal(getReadingState(parseRadarReading(frame({ source: "other" })), status, now, true).current, false)
  assert.equal(getReadingState(parseRadarReading(frame({ updatedAt: now + 30_000 })), status, now, true).current, false)
})

test("out-of-view detections retain their numeric measurements without being clamped", () => {
  const reading = parseRadarReading(frame({ targets: { 1: { ...target, xMm: 10000 } } }))
  assert.equal(reading.targets[0].xMm, 10000)
  assert.equal(targetInView(reading.targets[0]), false)
  assert.equal(targetInView(parseRadarReading(frame()).targets[0]), true)
})

test("events ignore legacy zones and other devices, validate time and retain newest 50", () => {
  const events = Object.fromEntries(Array.from({ length: 60 }, (_, index) => [String(index), { deviceId: "robot-01", timestamp: now + index }]))
  events.other = { deviceId: "robot-02", timestamp: now + 100 }
  events.legacy = { zone: "A", timestamp: now + 100 }
  events.invalid = { deviceId: "robot-01", timestamp: 1e100 }
  const parsed = parseEvents(events, "robot-01")
  assert.equal(parsed.length, 50)
  assert.equal(parsed[0].timestamp, now + 59)
})

test("missing environment variables fail with a useful message and no fallback credentials", () => {
  assert.throws(() => readFirebaseConfig({}), { code: "app/missing-config" })
  const config = readFirebaseConfig({ VITE_FIREBASE_API_KEY: "example", VITE_FIREBASE_AUTH_DOMAIN: "example.test", VITE_FIREBASE_DATABASE_URL: "https://example.test", VITE_FIREBASE_PROJECT_ID: "example", VITE_FIREBASE_APP_ID: "example" })
  assert.equal(config.projectId, "example")
})

test("a device ID cannot escape the intended Firebase path", () => {
  assert.equal(readDeviceId(undefined), "robot-01")
  assert.equal(readDeviceId("robot-01"), "robot-01")
  for (const value of ["../secret", "robot/a", "robot#1", "a.b"]) assert.throws(() => readDeviceId(value), { code: "app/invalid-device" })
})

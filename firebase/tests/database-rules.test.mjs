// Se ejecuta SOLO contra el emulador local. No usa credenciales reales ni escribe en la nube.
// Inicia primero el emulador oficial de Realtime Database en 127.0.0.1:9005.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const base = 'http://127.0.0.1:9005'
const namespace = 'demo-thalos-rules'
const writerUid = 'zAvi8jSz0eSn5T0vL4ECA1nQGns1'
const device = '/telemetry/devices/robot-01'
const radarPath = `${device}/sensors/ld2450`
const rules = await readFile(new URL('../database.rules.json', import.meta.url), 'utf8')
function token(uid, provider = 'password') {
  const now = Math.floor(Date.now() / 1000)
  const json64 = value => Buffer.from(JSON.stringify(value)).toString('base64url')
  return `${json64({ alg: 'none', typ: 'JWT' })}.${json64({
    iss: `https://securetoken.google.com/${namespace}`, aud: namespace,
    auth_time: now, user_id: uid, sub: uid, iat: now, exp: now + 3600,
    firebase: { identities: {}, sign_in_provider: provider },
  })}.`
}
const writer = token(writerUid)
const anonymous = token('web-reader', 'anonymous')
const other = token('other-account')
async function request(path, method, data, auth) {
  const url = new URL(`${path}.json`, base)
  url.searchParams.set('ns', namespace)
  if (auth && auth !== 'owner') url.searchParams.set('auth', auth)
  return fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json', ...(auth === 'owner' ? { Authorization: 'Bearer owner' } : {}) },
    ...(data !== undefined ? { body: JSON.stringify(data) } : {}),
  })
}
async function allowed(path, method, data, auth) {
  const response = await request(path, method, data, auth)
  const text = await response.text()
  assert.equal(response.status, 200, `${method} ${path}: ${text}`)
  return text ? JSON.parse(text) : null
}
async function denied(path, method, data, auth) {
  const response = await request(path, method, data, auth)
  const text = await response.text()
  assert.equal(response.status, 401, `${method} ${path} should be denied: ${text}`)
}
const target = { active: true, xMm: -782, yMm: 1713, speedCms: -16, resolutionMm: 320 }
const radar = (targets = { 1: target }) => ({ model: 'HLK-LD2450', source: 'sensor', updatedAt: Date.now(), sequence: 42, targetCount: Object.keys(targets).length, ...(Object.keys(targets).length ? { targets } : {}) })
const status = () => ({ lastSeenAt: { '.sv': 'timestamp' }, firmware: 'test/1.0', wifiRssiDbm: -50 })

test('Firebase rules enforce reader/device boundaries and valid radar frames', async t => {
  await allowed('/.settings/rules', 'PUT', JSON.parse(rules), 'owner')
  await allowed('', 'PUT', null, 'owner')
  await t.test('writer can atomically publish heartbeat and radar', async () => {
    await allowed(device, 'PATCH', { status: status(), 'sensors/ld2450': radar() }, writer)
  })
  await t.test('anonymous web reader can read telemetry but cannot write', async () => {
    await allowed('/telemetry', 'GET', undefined, anonymous)
    await denied(device, 'PATCH', { status: status() }, anonymous)
    await denied(radarPath, 'PUT', radar(), anonymous)
  })
  await t.test('unauthenticated and other accounts cannot write', async () => {
    await denied('/telemetry', 'GET')
    await denied(radarPath, 'PUT', radar())
    await denied(radarPath, 'PUT', radar(), other)
  })
  await t.test('writer cannot access other robots, events or unrelated paths', async () => {
    await denied('/telemetry/devices/robot-02/status', 'PUT', status(), writer)
    await denied('/telemetry/events/x', 'PUT', { timestamp: Date.now() }, writer)
    await denied('/robots/x', 'PUT', { arbitrary: true }, writer)
    await denied(`${device}/password`, 'PUT', 'secret', writer)
  })
  await t.test('writer can send three targets, then zero without ghost slots', async () => {
    await allowed(radarPath, 'PUT', radar({ 1: target, 2: target, 3: target }), writer)
    await allowed(radarPath, 'PUT', radar({}), writer)
    const actual = await allowed(radarPath, 'GET', undefined, anonymous)
    assert.equal(actual.targetCount, 0)
    assert.equal(actual.targets, undefined)
  })
  await t.test('count mismatches, invalid slots, empty targets and fake sources are denied', async () => {
    await denied(radarPath, 'PUT', { ...radar(), targetCount: 0 }, writer)
    await denied(radarPath, 'PUT', radar({ 4: target }), writer)
    await denied(radarPath, 'PUT', radar({ 1: { active: true, xMm: 0, yMm: 0, speedCms: 0, resolutionMm: 0 } }), writer)
    await denied(radarPath, 'PUT', { ...radar(), source: 'simulated' }, writer)
  })
  await t.test('partial target deletion cannot bypass count validation', async () => {
    await allowed(radarPath, 'PUT', radar(), writer)
    await denied(`${radarPath}/targets/1`, 'DELETE', undefined, writer)
    await denied(`${radarPath}/targetCount`, 'DELETE', undefined, writer)
  })
  await t.test('invalid numbers, timestamps and extra fields are denied', async () => {
    await denied(radarPath, 'PUT', radar({ 1: { ...target, xMm: 0.5 } }), writer)
    await denied(radarPath, 'PUT', radar({ 1: { ...target, speedCms: -32768 } }), writer)
    await denied(radarPath, 'PUT', radar({ 1: { ...target, resolutionMm: 65536 } }), writer)
    await denied(radarPath, 'PUT', { ...radar(), updatedAt: Date.now() - 60000 }, writer)
    await denied(radarPath, 'PUT', { ...radar(), updatedAt: Date.now() + 60000 }, writer)
    await denied(radarPath, 'PUT', { ...radar(), password: 'secret' }, writer)
    await denied(`${device}/status`, 'PUT', { ...status(), wifiRssiDbm: 'bad' }, writer)
    await denied(`${device}/status`, 'PUT', { ...status(), password: 'secret' }, writer)
  })
  await t.test('required fields and complete nodes cannot be deleted', async () => {
    await denied(`${device}/status/lastSeenAt`, 'DELETE', undefined, writer)
    await denied(`${device}/status`, 'DELETE', undefined, writer)
    await denied(radarPath, 'DELETE', undefined, writer)
  })
  await t.test('heartbeat without radar preserves the previous measurement time', async () => {
    await allowed(radarPath, 'PUT', radar(), writer)
    const before = await allowed(radarPath, 'GET', undefined, anonymous)
    await allowed(device, 'PATCH', { status: status() }, writer)
    const after = await allowed(radarPath, 'GET', undefined, anonymous)
    assert.deepEqual(after, before)
  })
})

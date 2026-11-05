import { getApp, getApps, initializeApp } from "firebase/app"
import { getAuth, signInAnonymously } from "firebase/auth"
import { getDatabase } from "firebase/database"
import { readDeviceId, readFirebaseConfig } from "./firebase-config"

let authentication: Promise<void> | undefined

export function getFirebaseClient() {
  const config = readFirebaseConfig(import.meta.env)
  const deviceId = readDeviceId(import.meta.env.VITE_TELEMETRY_DEVICE_ID)
  const app = getApps().length ? getApp() : initializeApp(config)
  return { auth: getAuth(app), database: getDatabase(app), deviceId }
}

export async function authenticateReader() {
  const client = getFirebaseClient()
  if (!authentication) {
    authentication = (async () => {
      await client.auth.authStateReady()
      if (!client.auth.currentUser) await signInAnonymously(client.auth)
    })().catch((error: unknown) => { authentication = undefined; throw error })
  }
  await authentication
  return client
}

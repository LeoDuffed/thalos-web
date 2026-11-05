const requiredFields = {
  apiKey: "VITE_FIREBASE_API_KEY",
  authDomain: "VITE_FIREBASE_AUTH_DOMAIN",
  databaseURL: "VITE_FIREBASE_DATABASE_URL",
  projectId: "VITE_FIREBASE_PROJECT_ID",
  appId: "VITE_FIREBASE_APP_ID",
} as const

export function readFirebaseConfig(env: Record<string, unknown>) {
  const missing = Object.values(requiredFields).filter((key) => typeof env[key] !== "string" || !String(env[key]).trim())
  if (missing.length) throw Object.assign(new Error(`Completa ${missing.join(", ")} en .env.local y reinicia Vite.`), { code: "app/missing-config" })
  const config = Object.fromEntries(Object.entries(requiredFields).map(([key, variable]) => [key, String(env[variable]).trim()])) as Record<keyof typeof requiredFields, string>
  return {
    ...config,
    storageBucket: typeof env.VITE_FIREBASE_STORAGE_BUCKET === "string" ? env.VITE_FIREBASE_STORAGE_BUCKET.trim() : undefined,
    messagingSenderId: typeof env.VITE_FIREBASE_MESSAGING_SENDER_ID === "string" ? env.VITE_FIREBASE_MESSAGING_SENDER_ID.trim() : undefined,
  }
}

export function readDeviceId(value: unknown) {
  const id = typeof value === "string" && value.trim() ? value.trim() : "robot-01"
  if (!/^[a-zA-Z0-9_-]{1,64}$/.test(id)) throw Object.assign(new Error("VITE_TELEMETRY_DEVICE_ID solo puede incluir letras, números, guiones y guiones bajos."), { code: "app/invalid-device" })
  return id
}

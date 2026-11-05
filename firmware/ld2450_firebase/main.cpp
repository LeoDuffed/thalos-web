#include <Arduino.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <sys/time.h>
#include "thalos_config.h"
#include "GoogleRoots.h"
#include "TelemetryPayload.h"

constexpr int kRadarRxPin = 16;
constexpr int kRadarTxPin = 17;
constexpr uint32_t kPublishIntervalMs = 500;
constexpr uint32_t kHeartbeatIntervalMs = 2000;
constexpr int64_t kMinimumClockMs = 1700000000000LL;

HardwareSerial RadarSerial(2);
thalos::Ld2450Parser parser;
thalos::RadarSnapshot latest;
portMUX_TYPE snapshotMux = portMUX_INITIALIZER_UNLOCKED;

int64_t unixMilliseconds() {
  timeval time;
  gettimeofday(&time, nullptr);
  const int64_t ms = int64_t(time.tv_sec) * 1000 + time.tv_usec / 1000;
  return ms >= kMinimumClockMs ? ms : 0;
}

thalos::RadarSnapshot readSnapshot() {
  portENTER_CRITICAL(&snapshotMux);
  const thalos::RadarSnapshot copy = latest;
  portEXIT_CRITICAL(&snapshotMux);
  return copy;
}

String encodeQuery(const String& input) {
  const char hex[] = "0123456789ABCDEF";
  String output;
  output.reserve(input.length() * 3);
  for (size_t i = 0; i < input.length(); ++i) {
    const uint8_t c = static_cast<uint8_t>(input[i]);
    if ((c >= 'A' && c <= 'Z') || (c >= 'a' && c <= 'z') ||
        (c >= '0' && c <= '9') || c == '-' || c == '_' || c == '.' || c == '~') {
      output += char(c);
    } else {
      output += '%'; output += hex[c >> 4]; output += hex[c & 15];
    }
  }
  return output;
}

void configureHttps(WiFiClientSecure& client, HTTPClient& http) {
  client.setCACert(kGoogleRoots);
  client.setHandshakeTimeout(6);
  http.setConnectTimeout(5000);
  http.setTimeout(5000);
  // Requests are bounded; retries always build a new snapshot.
  http.setReuse(false);
}

class FirebaseSession {
 public:
  bool needsAuthentication() const {
    return !idToken_.length() || uint32_t(millis() - obtainedAt_) >= validForMs_;
  }

  bool ready() {
    return !needsAuthentication() || signInOrRefresh();
  }

  const String& idToken() const { return idToken_; }

  void expireToken() { idToken_ = ""; }

 private:
  String idToken_;
  String refreshToken_;
  uint32_t obtainedAt_ = 0;
  uint32_t validForMs_ = 0;

  bool signInOrRefresh() {
    const bool refreshing = refreshToken_.length() > 0;
    const String url = refreshing
        ? String("https://securetoken.googleapis.com/v1/token?key=") + kFirebaseApiKey
        : String("https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=") + kFirebaseApiKey;
    String body;
    if (refreshing) {
      body = "grant_type=refresh_token&refresh_token=" + encodeQuery(refreshToken_);
    } else {
      JsonDocument credentials;
      credentials["email"] = kFirebaseEmail;
      credentials["password"] = kFirebasePassword;
      credentials["returnSecureToken"] = true;
      serializeJson(credentials, body);
    }
    WiFiClientSecure client;
    HTTPClient http;
    configureHttps(client, http);
    if (!http.begin(client, url)) return false;
    http.addHeader("Content-Type", refreshing ? "application/x-www-form-urlencoded" : "application/json");
    const int code = http.POST(body);
    // Never print a request URL, response body, email, password or token.
    body = "";
    if (code != HTTP_CODE_OK) {
      Serial.printf("Firebase: acceso no completado (HTTP %d). Revisar cuenta, red y hora.\n", code);
      if (refreshing && code == HTTP_CODE_BAD_REQUEST) refreshToken_ = "";
      http.end();
      return false;
    }
    JsonDocument result;
    const auto error = deserializeJson(result, http.getString());
    http.end();
    if (error) {
      Serial.println("Firebase: respuesta de acceso incompleta.");
      return false;
    }
    const char* uid = result[refreshing ? "user_id" : "localId"] | "";
    const char* token = result[refreshing ? "id_token" : "idToken"] | "";
    const char* refresh = result[refreshing ? "refresh_token" : "refreshToken"] | "";
    const uint32_t seconds = String(result[refreshing ? "expires_in" : "expiresIn"] | "0").toInt();
    if (String(uid) != kFirebaseExpectedUid || !token[0] || !refresh[0] || seconds <= 60 || seconds > 86400) {
      Serial.println("Firebase: cuenta o respuesta inesperada. Verifica el UID configurado.");
      idToken_ = ""; refreshToken_ = "";
      return false;
    }
    idToken_ = token;
    refreshToken_ = refresh;
    obtainedAt_ = millis();
    validForMs_ = (seconds - 60) * 1000;
    Serial.println(refreshing ? "Firebase: sesion renovada." : "Firebase: cuenta de la ESP32 autenticada.");
    return true;
  }
};

void uploadTask(void*) {
  WiFi.persistent(false);
  WiFi.mode(WIFI_STA);
  WiFi.setAutoReconnect(true);
  WiFi.begin(kWifiSsid, kWifiPassword);
  Serial.println("WiFi: conectando...");
  FirebaseSession session;
  WiFiClientSecure client;
  HTTPClient http;
  configureHttps(client, http);
  http.setReuse(true);
  uint32_t lastWifiTry = millis();
  uint32_t lastAttempt = 0;
  uint32_t retryDelay = kPublishIntervalMs;
  uint32_t lastHeartbeat = 0;
  uint32_t lastLog = 0;
  uint32_t lastPublishedSequence = 0;
  bool hasPublished = false;
  bool wifiWasConnected = false;
  bool clockRequested = false;

  for (;;) {
    vTaskDelay(pdMS_TO_TICKS(20));
    uint32_t now = millis();
    if (WiFi.status() != WL_CONNECTED) {
      if (wifiWasConnected) {
        Serial.println("WiFi: conexion perdida; se siguen leyendo tramas por UART.");
        client.stop();
      }
      wifiWasConnected = false;
      if (uint32_t(now - lastWifiTry) >= 15000) {
        lastWifiTry = now;
        WiFi.disconnect();
        WiFi.begin(kWifiSsid, kWifiPassword);
        Serial.println("WiFi: reintentando conexion...");
      }
      continue;
    }
    if (!wifiWasConnected) {
      wifiWasConnected = true;
      Serial.println("WiFi: conectado. Preparando HTTPS...");
      retryDelay = kPublishIntervalMs;
    }
    if (!clockRequested) {
      configTime(0, 0, "time.google.com", "pool.ntp.org", "time.cloudflare.com");
      clockRequested = true;
      Serial.println("Hora: sincronizando para verificar certificados HTTPS...");
    }
    if (!unixMilliseconds()) {
      if (uint32_t(now - lastLog) >= 15000) {
        lastLog = now;
        Serial.println("Hora: esperando sincronizacion; revisa que la red permita acceso a Internet.");
      }
      continue;
    }
    if (uint32_t(now - lastAttempt) < retryDelay) continue;
    lastAttempt = now;
    if (session.needsAuthentication()) {
      // Release the database TLS socket before opening the authentication one.
      client.stop();
    }
    if (!session.ready()) {
      retryDelay = min(uint32_t(30000), max(uint32_t(5000), retryDelay * 2));
      continue;
    }

    // Read after potentially slow authentication. Never queue measurements offline.
    const thalos::RadarSnapshot snapshot = readSnapshot();
    now = millis();
    const bool fresh = thalos::hasNewFreshReading(snapshot, now, hasPublished, lastPublishedSequence);
    if (!fresh && uint32_t(now - lastHeartbeat) < kHeartbeatIntervalMs) continue;

    JsonDocument patch;
    const bool includesRadar = thalos::buildDevicePatch(patch, snapshot, now, hasPublished,
                                                       lastPublishedSequence, WiFi.RSSI());
    String payload;
    serializeJson(patch, payload);
    const String url = String(kFirebaseDatabaseUrl) + "/telemetry/devices/" + kDeviceId +
                       ".json?print=silent&auth=" + encodeQuery(session.idToken());
    if (!http.begin(client, url)) {
      retryDelay = 5000;
      continue;
    }
    http.addHeader("Content-Type", "application/json");
    const int code = http.PATCH(payload);
    if (code == HTTP_CODE_OK || code == HTTP_CODE_NO_CONTENT) {
      lastHeartbeat = millis();
      retryDelay = kPublishIntervalMs;
      if (includesRadar) {
        hasPublished = true;
        lastPublishedSequence = snapshot.sequence;
      }
      if (uint32_t(millis() - lastLog) >= 5000) {
        lastLog = millis();
        if (includesRadar) {
          Serial.printf("Firebase OK | trama=%lu | objetivos=%u | HTTP=%d\n",
                        static_cast<unsigned long>(snapshot.sequence),
                        static_cast<unsigned>(snapshot.frame.targetCount), code);
        } else {
          Serial.println("Firebase OK | ESP32 activa, sin nueva trama vigente del radar.");
        }
      }
    } else {
      // Permission errors also use 401. Do not keep logging in on a rules error.
      const String response = code > 0 ? http.getString() : String();
      if (code == 401 && (response.indexOf("expired") >= 0 || response.indexOf("Invalid auth") >= 0)) {
        session.expireToken();
      }
      Serial.printf("Firebase: envio no completado (HTTP %d). Revisar reglas/red; se reintentara.\n", code);
      retryDelay = min(uint32_t(30000), max(uint32_t(5000), retryDelay * 2));
    }
    http.end();
  }
}

void setup() {
  Serial.begin(115200);
  RadarSerial.setRxBufferSize(2048);
  RadarSerial.begin(256000, SERIAL_8N1, kRadarRxPin, kRadarTxPin);
  Serial.println("\nTHALOS | HLK-LD2450 -> ESP32 -> Firebase por HTTPS");
  if (!kThalosConfigReady) {
    Serial.println("COMPILACION DE COMPROBACION: WiFi desactivado. Completa firmware/.env.local y recompila.");
    return;
  }
  // Blocking HTTPS runs on core 0. Arduino loop keeps draining UART on core 1.
  if (xTaskCreatePinnedToCore(uploadTask, "firebase-upload", 16384, nullptr, 1, nullptr, 0) != pdPASS) {
    Serial.println("No fue posible iniciar WiFi: memoria insuficiente.");
  }
}

void loop() {
  static uint32_t sequence = 0;
  static uint32_t lastPrintAt = 0;
  thalos::RadarFrame frame;
  while (RadarSerial.available() > 0) {
    const int value = RadarSerial.read();
    if (value < 0) break;
    if (parser.push(static_cast<uint8_t>(value), frame)) {
      thalos::RadarSnapshot snapshot;
      snapshot.frame = frame;
      snapshot.sequence = ++sequence;
      snapshot.receivedAtMs = millis();
      snapshot.capturedAtUnixMs = unixMilliseconds();
      snapshot.hasReading = true;
      portENTER_CRITICAL(&snapshotMux);
      latest = snapshot;
      portEXIT_CRITICAL(&snapshotMux);
    }
  }
  const uint32_t now = millis();
  if (uint32_t(now - lastPrintAt) >= 2000) {
    lastPrintAt = now;
    const auto snapshot = readSnapshot();
    if (snapshot.hasReading && uint32_t(now - snapshot.receivedAtMs) <= 1000) {
      Serial.printf("Radar UART | trama=%lu | objetivos=%u\n",
                    static_cast<unsigned long>(snapshot.sequence),
                    static_cast<unsigned>(snapshot.frame.targetCount));
    } else {
      Serial.println("Radar UART | SIN TRAMAS VIGENTES; no se publica un cero falso.");
    }
  }
  delay(1);
}

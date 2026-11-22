#pragma once

#include <ArduinoJson.h>
#include <stdint.h>

namespace thalos {

struct ThermalSnapshot {
  int32_t pixels[64]{};
  uint32_t sequence = 0;
  uint32_t receivedAtMs = 0;
  int64_t capturedAtUnixMs = 0;
  bool hasReading = false;
};

inline bool hasNewFreshThermalReading(const ThermalSnapshot& snapshot, uint32_t now,
                                     bool hasPublished, uint32_t lastSequence) {
  if (!snapshot.hasReading || snapshot.capturedAtUnixMs <= 0 ||
      uint32_t(now - snapshot.receivedAtMs) > 3000U ||
      (hasPublished && snapshot.sequence == lastSequence)) return false;
  // Limites representables por el driver de 12 bits, en centesimas de grado.
  for (int32_t value : snapshot.pixels) {
    if (value < -51200 || value > 51175) return false;
  }
  return true;
}

inline bool buildThermalDevicePatch(JsonDocument& patch, const ThermalSnapshot& snapshot,
                                    uint32_t now, bool hasPublished,
                                    uint32_t lastSequence, int rssi) {
  patch.clear();
  JsonObject status = patch["status"].to<JsonObject>();
  status["lastSeenAt"][".sv"] = "timestamp";
  status["firmware"] = "thalos-nucleo-thermal-https/1.0.0";
  status["wifiRssiDbm"] = rssi;
  if (!hasNewFreshThermalReading(snapshot, now, hasPublished, lastSequence)) return false;

  // Solo se reemplaza este sensor: los datos del radar permanecen intactos.
  JsonObject thermal = patch["sensors/amg8831"].to<JsonObject>();
  thermal["model"] = "AMG8831";
  thermal["source"] = "sensor";
  thermal["unit"] = "centicelsius";
  thermal["width"] = 8;
  thermal["height"] = 8;
  // Hora de recepcion de la matriz completa en la ESP32, nunca hora del reintento.
  thermal["updatedAt"] = snapshot.capturedAtUnixMs;
  thermal["sequence"] = snapshot.sequence;
  JsonArray pixels = thermal["pixels"].to<JsonArray>();
  for (int32_t value : snapshot.pixels) pixels.add(value);
  return true;
}

}  // namespace thalos

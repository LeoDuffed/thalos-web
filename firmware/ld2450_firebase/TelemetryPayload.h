#pragma once

#include <ArduinoJson.h>
#include "../ld2450_serial_test/Ld2450Parser.h"

namespace thalos {

struct RadarSnapshot {
  RadarFrame frame;
  uint32_t sequence = 0;
  uint32_t receivedAtMs = 0;
  int64_t capturedAtUnixMs = 0;
  bool hasReading = false;
};

// Never resend an old measurement with a new timestamp, including after a retry.
inline bool hasNewFreshReading(const RadarSnapshot& snapshot, uint32_t now,
                               bool hasPublished, uint32_t lastSequence) {
  return snapshot.hasReading && snapshot.capturedAtUnixMs > 0 &&
         uint32_t(now - snapshot.receivedAtMs) <= 1000 &&
         (!hasPublished || snapshot.sequence != lastSequence);
}

// The entire radar node is replaced inside an atomic device PATCH. Omitted
// targets therefore disappear when the count drops; unrelated nodes survive.
inline bool buildDevicePatch(JsonDocument& patch, const RadarSnapshot& snapshot,
                             uint32_t now, bool hasPublished,
                             uint32_t lastSequence, int rssi) {
  patch.clear();
  JsonObject status = patch["status"].to<JsonObject>();
  status["lastSeenAt"][".sv"] = "timestamp";
  status["firmware"] = "thalos-ld2450-https/1.0.0";
  status["wifiRssiDbm"] = rssi;
  if (!hasNewFreshReading(snapshot, now, hasPublished, lastSequence)) return false;

  JsonObject radar = patch["sensors/ld2450"].to<JsonObject>();
  radar["model"] = "HLK-LD2450";
  radar["source"] = "sensor";
  // Capture time from the SNTP-synchronized ESP clock, rather than upload time:
  // slow HTTPS must not make an older UART reading appear newly measured.
  radar["updatedAt"] = snapshot.capturedAtUnixMs;
  radar["sequence"] = snapshot.sequence;
  radar["targetCount"] = snapshot.frame.targetCount;
  for (uint8_t slot = 0; slot < 3; ++slot) {
    const RadarTarget& target = snapshot.frame.targets[slot];
    if (!target.active) continue;
    static const char* const keys[] = {"1", "2", "3"};
    JsonObject point = radar["targets"][keys[slot]].to<JsonObject>();
    point["active"] = true;
    point["xMm"] = target.xMm;
    point["yMm"] = target.yMm;
    point["speedCms"] = target.speedCms;
    point["resolutionMm"] = target.resolutionMm;
  }
  return true;
}

}  // namespace thalos

#include <cassert>
#include <cstdint>
#include <iostream>
#include "../nucleo_firebase/ThermalTelemetryPayload.h"

int main() {
  thalos::ThermalSnapshot snapshot;
  JsonDocument patch;
  assert(!thalos::buildThermalDevicePatch(patch, snapshot, 1000, false, 0, -50));
  assert(patch["status"]["lastSeenAt"][".sv"] == "timestamp");
  assert(patch["sensors/amg8831"].isNull());
  snapshot.hasReading = true;
  snapshot.sequence = 12;
  snapshot.receivedAtMs = 1000;
  assert(!thalos::buildThermalDevicePatch(patch, snapshot, 1001, false, 0, -50));
  snapshot.capturedAtUnixMs = 1800000000123LL;
  for (size_t i = 0; i < 64; ++i) snapshot.pixels[i] = 2000 + int32_t(i) * 25;
  snapshot.pixels[0] = -25;
  assert(thalos::buildThermalDevicePatch(patch, snapshot, 1050, false, 0, -50));
  assert(patch["sensors/amg8831"]["pixels"].size() == 64);
  assert(patch["sensors/amg8831"]["pixels"][0] == -25);
  assert(patch["sensors/amg8831"]["pixels"][63] == 3575);
  assert(patch["sensors/amg8831"]["unit"] == "centicelsius");
  assert(patch["sensors/amg8831"]["updatedAt"].as<int64_t>() == snapshot.capturedAtUnixMs);
  assert(patch["sensors/ld2450"].isNull());
  assert(!thalos::buildThermalDevicePatch(patch, snapshot, 1100, true, 12, -50));
  assert(!thalos::buildThermalDevicePatch(patch, snapshot, 4001, false, 0, -50));
  assert(patch["sensors/amg8831"].isNull());
  assert(thalos::buildThermalDevicePatch(patch, snapshot, 4000, false, 0, -50));
  // La hora original sobrevive a los reintentos; un heartbeat no la renueva.
  assert(patch["sensors/amg8831"]["updatedAt"].as<int64_t>() == 1800000000123LL);
  for (int32_t invalid : {-51201, 51176}) {
    snapshot.pixels[20] = invalid;
    assert(!thalos::buildThermalDevicePatch(patch, snapshot, 1100, false, 0, -50));
    assert(patch["sensors/amg8831"].isNull());
  }
  for (int32_t& pixel : snapshot.pixels) pixel = 0;
  assert(thalos::buildThermalDevicePatch(patch, snapshot, 1100, false, 0, -50));
  assert(patch["sensors/amg8831"]["pixels"].size() == 64);
  snapshot.receivedAtMs = UINT32_MAX - 100;
  snapshot.sequence = 0;
  assert(thalos::hasNewFreshThermalReading(snapshot, 20, true, UINT32_MAX));
  assert(!thalos::hasNewFreshThermalReading(snapshot, 4000, true, UINT32_MAX));
  std::cout << "OK: payload termico, unidades, orden, ceros reales, antiguedad, reintentos y rollover.\n";
}

#include <assert.h>
#include <stdint.h>
#include <iostream>
#include "../ld2450_firebase/TelemetryPayload.h"

int main() {
  thalos::RadarSnapshot snapshot;
  JsonDocument patch;
  // Sin una trama UART solo se publica el estado de la placa, nunca un cero inventado.
  assert(!thalos::buildDevicePatch(patch, snapshot, 1000, false, 0, -50));
  assert(patch["status"]["lastSeenAt"][".sv"] == "timestamp");
  assert(patch["sensors/ld2450"].isNull());

  snapshot.hasReading = true;
  snapshot.receivedAtMs = 1000;
  snapshot.sequence = 12;
  // Las horas de captura del radar no están disponibles hasta sincronizar el reloj.
  assert(!thalos::buildDevicePatch(patch, snapshot, 1001, false, 0, -50));
  snapshot.capturedAtUnixMs = 1800000000123LL;
  snapshot.frame.targetCount = 1;
  snapshot.frame.targets[2].active = true;
  snapshot.frame.targets[2].xMm = -782;
  snapshot.frame.targets[2].yMm = 1713;
  snapshot.frame.targets[2].speedCms = -16;
  snapshot.frame.targets[2].resolutionMm = 320;
  assert(thalos::buildDevicePatch(patch, snapshot, 1050, false, 0, -50));
  assert(patch["sensors/ld2450"]["source"] == "sensor");
  assert(patch["sensors/ld2450"]["updatedAt"].as<int64_t>() == 1800000000123LL);
  assert(patch["sensors/ld2450"]["targets"]["3"]["xMm"] == -782);
  assert(patch["sensors/ld2450"]["targets"]["3"]["speedCms"] == -16);
  assert(patch["sensors/ld2450"]["targets"]["1"].isNull());
  // No se envía dos veces la misma secuencia ni se reintenta una lectura ya caducada.
  assert(!thalos::buildDevicePatch(patch, snapshot, 1100, true, 12, -50));
  assert(!thalos::buildDevicePatch(patch, snapshot, 2001, false, 0, -50));
  assert(patch["sensors/ld2450"].isNull());

  // Una nueva trama válida sin objetivos reemplaza el nodo del radar sin dejar ranuras antiguas.
  snapshot.frame = thalos::RadarFrame{};
  snapshot.sequence = 13;
  snapshot.receivedAtMs = 2100;
  assert(thalos::buildDevicePatch(patch, snapshot, 2150, true, 12, -50));
  assert(patch["sensors/ld2450"]["targetCount"] == 0);
  assert(patch["sensors/ld2450"]["targets"].isNull());

  // El desbordamiento de millis debe conservar las comprobaciones de antigüedad y secuencia.
  snapshot.receivedAtMs = UINT32_MAX - 100;
  assert(thalos::hasNewFreshReading(snapshot, 20, true, 12));
  assert(!thalos::hasNewFreshReading(snapshot, 1100, true, 12));
  snapshot.sequence = 0;
  assert(thalos::hasNewFreshReading(snapshot, 20, true, UINT32_MAX));
  std::cout << "Telemetry payload tests passed\n";
}

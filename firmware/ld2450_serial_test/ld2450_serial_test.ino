#include <Arduino.h>
#include "Ld2450Parser.h"

// ESP32-WROOM-32 board shown by the user: RX2 = GPIO16, TX2 = GPIO17.
constexpr int kRadarRxPin = 16;  // Connect to LD2450 TX.
constexpr int kRadarTxPin = 17;  // Connect to LD2450 RX.
constexpr uint32_t kRadarBaud = 256000;
constexpr uint32_t kMonitorBaud = 115200;
constexpr uint32_t kPrintIntervalMs = 500;
constexpr uint32_t kSensorTimeoutMs = 2000;

HardwareSerial RadarSerial(2);
thalos::Ld2450Parser parser;
thalos::RadarFrame latest;
uint32_t receivedBytes = 0;
uint32_t validFrames = 0;
uint32_t lastValidAt = 0;
uint32_t lastPrintAt = 0;
bool hasReading = false;

void setup() {
  Serial.begin(kMonitorBaud);
  RadarSerial.setRxBufferSize(1024);
  RadarSerial.begin(kRadarBaud, SERIAL_8N1, kRadarRxPin, kRadarTxPin);
  delay(500);
  Serial.println();
  Serial.println("THALOS | Prueba real HLK-LD2450 por UART");
  Serial.println("Monitor USB: 115200 | Radar: 256000, 8N1");
  Serial.println("LD2450 TX -> ESP32 RX2/GPIO16");
  Serial.println("LD2450 RX -> ESP32 TX2/GPIO17");
  Serial.println("Esperando tramas del sensor...");
}

void printReading(uint32_t now) {
  if (!hasReading || uint32_t(now - lastValidAt) > kSensorTimeoutMs) {
    Serial.printf(
      "SIN TRAMAS VIGENTES | bytes=%lu | validas=%lu | invalidas=%lu\n",
      static_cast<unsigned long>(receivedBytes),
      static_cast<unsigned long>(validFrames),
      static_cast<unsigned long>(parser.invalidFrames()));
    if (hasReading) {
      Serial.printf("Ultima trama hace %lu ms. No se interpreta como cero objetivos.\n",
                    static_cast<unsigned long>(uint32_t(now - lastValidAt)));
    }
    return;
  }

  Serial.printf("Muestra #%lu | objetivos=%u | antiguedad=%lu ms\n",
                static_cast<unsigned long>(validFrames),
                static_cast<unsigned>(latest.targetCount),
                static_cast<unsigned long>(uint32_t(now - lastValidAt)));
  for (uint8_t slot = 0; slot < 3; ++slot) {
    const thalos::RadarTarget& target = latest.targets[slot];
    if (!target.active) continue;
    Serial.printf(
      " T%u | X=%d mm | Y=%d mm | distancia=%.3f m | "
      "velocidad=%d cm/s | angulo=%.1f grados | resolucion=%u mm\n",
      static_cast<unsigned>(slot + 1),
      static_cast<int>(target.xMm), static_cast<int>(target.yMm),
      target.distanceM(), static_cast<int>(target.speedCms),
      target.angleDeg(), static_cast<unsigned>(target.resolutionMm));
  }
  if (latest.targetCount == 0) {
    Serial.println(" Trama valida: el radar reporta cero objetivos.");
  }
}

void loop() {
  while (RadarSerial.available() > 0) {
    const int value = RadarSerial.read();
    if (value < 0) break;
    ++receivedBytes;
    if (parser.push(static_cast<uint8_t>(value), latest)) {
      ++validFrames;
      lastValidAt = millis();
      hasReading = true;
    }
  }

  const uint32_t now = millis();
  if (uint32_t(now - lastPrintAt) >= kPrintIntervalMs) {
    lastPrintAt = now;
    printReading(now);
  }
  delay(1);
}

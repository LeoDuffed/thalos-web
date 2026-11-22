#include <Arduino.h>
#include "ThermalFrameParser.h"

namespace {
constexpr uint32_t kBaudRate = 115200;
constexpr int kNucleoRxPin = 16;  // Nucleo PC12 (UART5 TX) -> ESP32 RX2.
constexpr int kNucleoTxPin = 17;  // ESP32 TX2 -> Nucleo PD2 (UART5 RX).
constexpr uint32_t kStaleAfterMs = 3000;

thalos::ThermalFrameParser parser;
uint32_t frameCount = 0;
uint32_t lastFrameMs = 0;
bool staleReported = false;
bool linkReported = false;

void printTemperature(int32_t value) {
  const uint32_t magnitude = value < 0 ? uint32_t(-int64_t(value)) : uint32_t(value);
  Serial.printf("%s%lu.%02lu", value < 0 ? "-" : "",
                static_cast<unsigned long>(magnitude / 100U),
                static_cast<unsigned long>(magnitude % 100U));
}

void printFrame() {
  Serial.printf("\nCuadro termico #%lu | bloques descartados=%lu\n",
                static_cast<unsigned long>(frameCount),
                static_cast<unsigned long>(parser.invalidFrames()));
  // Este bloque se puede copiar a la prueba termica de la web, en grados Celsius.
  Serial.println("AMG8831 - grados C:");
  const int32_t* values = parser.temperatures();
  for (size_t row = 0; row < 8; ++row) {
    for (size_t col = 0; col < 8; ++col) {
      if (col > 0) Serial.print(' ');
      printTemperature(values[row * 8U + col]);
    }
    Serial.println();
  }
}
}  // namespace

void setup() {
  Serial.begin(kBaudRate, SERIAL_8N1);
  Serial2.setRxBufferSize(2048);
  Serial2.begin(kBaudRate, SERIAL_8N1, kNucleoRxPin, kNucleoTxPin);
  lastFrameMs = millis();
  Serial.println("Thalos: receptor termico UART2, 115200 8N1, RX=16 TX=17.");
  Serial.println("Esperando encabezado AMG8831 y ocho filas de ocho temperaturas...");
}

void loop() {
  using Result = thalos::ThermalFrameParser::Result;
  if (parser.expire(millis())) {
    Serial.println("UART2: bloque termico incompleto; descartado por tiempo de espera.");
  }

  for (size_t count = 0; count < 1024 && Serial2.available() > 0; ++count) {
    const int value = Serial2.read();
    if (value < 0) break;
    const Result result = parser.push(static_cast<uint8_t>(value), millis());
    if (result == Result::FrameReady) {
      ++frameCount;
      lastFrameMs = millis();
      staleReported = false;
      printFrame();
    } else if (result == Result::Rejected) {
      Serial.println("UART2: bloque termico incompleto o invalido; descartado.");
    } else if (result == Result::LinkReady && !linkReported) {
      Serial.println("UART2: THALOS UART OK recibido; esperando la matriz termica.");
      linkReported = true;
    }
  }

  if (!staleReported && uint32_t(millis() - lastFrameMs) >= kStaleAfterMs) {
    Serial.println("SIN CUADROS TERMICOS VIGENTES: 3 s sin una matriz completa.");
    staleReported = true;
  }
}

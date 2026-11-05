#pragma once

#include <stddef.h>
#include <stdint.h>
#include <string.h>
#include <math.h>

namespace thalos {

struct RadarTarget {
  bool active = false;
  int16_t xMm = 0;
  int16_t yMm = 0;
  int16_t speedCms = 0;
  uint16_t resolutionMm = 0;

  float distanceM() const {
    return sqrtf(float(xMm) * xMm + float(yMm) * yMm) / 1000.0f;
  }

  float angleDeg() const {
    return atan2f(float(xMm), float(yMm)) * 180.0f / 3.14159265358979323846f;
  }
};

struct RadarFrame {
  RadarTarget targets[3];
  uint8_t targetCount = 0;
};

// Protocolo HLK-LD2450 V1.03, sección 2.3:
// AA FF 03 00 + tres ranuras de objetivos de 8 bytes + 55 CC.
// Una ventana deslizante recupera la sincronización tras tramas incompletas, ruido o finales incorrectos.
class Ld2450Parser {
 public:
  static const size_t kFrameSize = 30;

  static int16_t decodeSigned(uint16_t raw) {
    const int16_t magnitude = int16_t(raw & 0x7FFF);
    return (raw & 0x8000) ? magnitude : int16_t(-magnitude);
  }

  bool push(uint8_t byte, RadarFrame& output) {
    buffer_[size_++] = byte;
    if (size_ < kFrameSize) return false;

    const bool header = buffer_[0] == 0xAA && buffer_[1] == 0xFF &&
                        buffer_[2] == 0x03 && buffer_[3] == 0x00;
    if (header && buffer_[28] == 0x55 && buffer_[29] == 0xCC) {
      output = RadarFrame{};
      for (size_t slot = 0; slot < 3; ++slot) {
        const uint8_t* data = buffer_ + 4 + slot * 8;
        RadarTarget& target = output.targets[slot];
        bool present = false;
        for (size_t index = 0; index < 8; ++index) present |= data[index] != 0;
        target.active = present;
        if (!present) continue;
        target.xMm = decodeSigned(read16(data));
        target.yMm = decodeSigned(read16(data + 2));
        target.speedCms = decodeSigned(read16(data + 4));
        target.resolutionMm = read16(data + 6);
        ++output.targetCount;
      }
      size_ = 0;
      return true;
    }

    if (header) ++invalidFrames_;
    memmove(buffer_, buffer_ + 1, kFrameSize - 1);
    size_ = kFrameSize - 1;
    return false;
  }

  uint32_t invalidFrames() const { return invalidFrames_; }

 private:
  static uint16_t read16(const uint8_t* bytes) {
    return uint16_t(bytes[0]) | (uint16_t(bytes[1]) << 8);
  }

  uint8_t buffer_[kFrameSize] = {};
  size_t size_ = 0;
  uint32_t invalidFrames_ = 0;
};

}  // Espacio de nombres thalos

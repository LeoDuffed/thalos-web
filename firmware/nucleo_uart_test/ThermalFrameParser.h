#pragma once

#include <stddef.h>
#include <stdint.h>
#include <string.h>

namespace thalos {

// Protocolo: encabezado y ocho filas de ocho temperaturas con dos decimales.
// Los valores se guardan en centesimas de grado, como en el driver de la Nucleo.
class ThermalFrameParser {
 public:
  enum class Result { None, LinkReady, FrameReady, Rejected };

  Result push(uint8_t byte, uint32_t nowMs) {
    if (byte == '\n') {
      if (discardLine_) {
        discardLine_ = false;
        used_ = 0;
        return Result::None;
      }
      if (used_ > 0 && line_[used_ - 1] == '\r') --used_;
      line_[used_] = '\0';
      const Result result = processLine(nowMs);
      used_ = 0;
      return result;
    }
    if (discardLine_) return Result::None;
    if (byte == 0 || used_ == sizeof(line_) - 1) {
      discardLine_ = true;
      used_ = 0;
      return receiving_ ? reject() : Result::None;
    }
    line_[used_++] = static_cast<char>(byte);
    return Result::None;
  }

  bool expire(uint32_t nowMs) {
    if (!receiving_ || uint32_t(nowMs - startedAtMs_) < 1500U) return false;
    reject();
    used_ = 0;
    discardLine_ = false;
    return true;
  }

  const int32_t* temperatures() const { return complete_; }
  uint32_t invalidFrames() const { return invalidFrames_; }

 private:
  char line_[128]{};
  size_t used_ = 0;
  bool discardLine_ = false;
  bool receiving_ = false;
  uint8_t rows_ = 0;
  uint32_t startedAtMs_ = 0;
  uint32_t invalidFrames_ = 0;
  int32_t pending_[64]{};
  int32_t complete_[64]{};

  static bool isDigit(char c) { return c >= '0' && c <= '9'; }
  static void skipSpaces(const char*& p) {
    while (*p == ' ' || *p == '\t') ++p;
  }

  static bool parseTemperature(const char*& p, int32_t& value) {
    const bool negative = *p == '-';
    if (*p == '-' || *p == '+') ++p;
    if (!isDigit(*p)) return false;
    uint64_t whole = 0;
    while (isDigit(*p)) {
      whole = whole * 10U + static_cast<unsigned>(*p++ - '0');
      if (whole > 21474836U) return false;
    }
    if (*p != '.') return false;
    ++p;
    if (!isDigit(*p)) return false;
    const unsigned tenths = static_cast<unsigned>(*p++ - '0');
    if (!isDigit(*p)) return false;
    const unsigned hundredths = static_cast<unsigned>(*p++ - '0');
    if (*p != '\0' && *p != ' ' && *p != '\t') return false;
    const uint64_t magnitude = whole * 100U + tenths * 10U + hundredths;
    const uint64_t limit = negative ? 2147483648ULL : 2147483647ULL;
    if (magnitude > limit) return false;
    const int64_t signedValue = negative ? -static_cast<int64_t>(magnitude)
                                         : static_cast<int64_t>(magnitude);
    value = static_cast<int32_t>(signedValue);
    return true;
  }

  bool parseRow() {
    const char* p = line_;
    for (size_t col = 0; col < 8; ++col) {
      skipSpaces(p);
      if (!parseTemperature(p, pending_[rows_ * 8U + col])) return false;
    }
    skipSpaces(p);
    return *p == '\0';
  }

  Result reject() {
    receiving_ = false;
    rows_ = 0;
    ++invalidFrames_;
    return Result::Rejected;
  }

  Result processLine(uint32_t nowMs) {
    if (strcmp(line_, "AMG8831 - grados C:") == 0) {
      const bool interrupted = receiving_;
      if (interrupted) reject();
      receiving_ = true;
      rows_ = 0;
      startedAtMs_ = nowMs;
      return interrupted ? Result::Rejected : Result::None;
    }
    if (!receiving_) {
      return strcmp(line_, "THALOS UART OK") == 0 ? Result::LinkReady : Result::None;
    }
    if (!parseRow()) return reject();
    if (++rows_ < 8) return Result::None;
    memcpy(complete_, pending_, sizeof(complete_));
    receiving_ = false;
    rows_ = 0;
    return Result::FrameReady;
  }
};

}  // namespace thalos

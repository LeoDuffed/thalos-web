#include <array>
#include <cassert>
#include <cmath>
#include <iostream>
#include "../ld2450_serial_test/Ld2450Parser.h"

using Bytes = std::array<uint8_t, 30>;

Bytes emptyFrame() {
  Bytes data{};
  data[0] = 0xAA; data[1] = 0xFF; data[2] = 0x03; data[3] = 0x00;
  data[28] = 0x55; data[29] = 0xCC;
  return data;
}

Bytes manufacturerExample() {
  Bytes data = emptyFrame();
  const uint8_t target[] = {0x0E, 0x03, 0xB1, 0x86, 0x10, 0x00, 0x40, 0x01};
  for (size_t i = 0; i < 8; ++i) data[4 + i] = target[i];
  return data;
}

int feed(thalos::Ld2450Parser& parser, const Bytes& bytes, thalos::RadarFrame& frame) {
  int count = 0;
  for (uint8_t byte : bytes) if (parser.push(byte, frame)) ++count;
  return count;
}

int main() {
  using thalos::Ld2450Parser;
  assert(Ld2450Parser::decodeSigned(0x030E) == -782);
  assert(Ld2450Parser::decodeSigned(0x86B1) == 1713);
  assert(Ld2450Parser::decodeSigned(0xFFFF) == 32767);
  assert(Ld2450Parser::decodeSigned(0x7FFF) == -32767);
  assert(Ld2450Parser::decodeSigned(0x8000) == 0);
  assert(Ld2450Parser::decodeSigned(0x0000) == 0);

  thalos::RadarFrame frame;
  Ld2450Parser parser;
  assert(feed(parser, manufacturerExample(), frame) == 1);
  assert(frame.targetCount == 1);
  assert(frame.targets[0].xMm == -782);
  assert(frame.targets[0].yMm == 1713);
  assert(frame.targets[0].speedCms == -16);
  assert(frame.targets[0].resolutionMm == 320);
  assert(std::abs(frame.targets[0].distanceM() - 1.8826f) < 0.002f);
  assert(!frame.targets[1].active && !frame.targets[2].active);

  assert(feed(parser, emptyFrame(), frame) == 1);
  assert(frame.targetCount == 0);
  assert(!frame.targets[0].active);  // Old detections must be cleared.

  Bytes three = manufacturerExample();
  for (size_t slot = 1; slot < 3; ++slot) {
    for (size_t i = 0; i < 8; ++i) three[4 + slot * 8 + i] = three[4 + i];
  }
  assert(feed(parser, three, frame) == 1 && frame.targetCount == 3);

  Ld2450Parser noisy;
  const uint8_t noise[] = {0x00, 0xAA, 0xFF, 0x03, 0xAA, 0x14, 0x55};
  for (uint8_t byte : noise) assert(!noisy.push(byte, frame));
  assert(feed(noisy, manufacturerExample(), frame) == 1);

  Bytes corrupt = manufacturerExample();
  corrupt[29] = 0;
  Ld2450Parser recovering;
  assert(feed(recovering, corrupt, frame) == 0);
  assert(recovering.invalidFrames() == 1);
  assert(feed(recovering, manufacturerExample(), frame) == 1);

  Ld2450Parser truncated;
  const Bytes sample = manufacturerExample();
  for (size_t i = 0; i < 12; ++i) assert(!truncated.push(sample[i], frame));
  assert(feed(truncated, sample, frame) == 1);
  assert(feed(truncated, sample, frame) == 1);

  std::cout << "OK: signos, ejemplo oficial, cero y tres objetivos, ruido, truncamiento y resincronizacion.\n";
}

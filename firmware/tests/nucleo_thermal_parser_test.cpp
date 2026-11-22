#include <array>
#include <cassert>
#include <cstdint>
#include <iomanip>
#include <iostream>
#include <sstream>
#include <string>
#include "../nucleo_uart_test/ThermalFrameParser.h"

using Parser = thalos::ThermalFrameParser;
using Result = Parser::Result;
using Pixels = std::array<int32_t, 64>;

struct Events {
  int frames = 0;
  int rejected = 0;
  int links = 0;
};

Events feed(Parser& parser, const std::string& text, uint32_t now = 0) {
  Events events;
  for (unsigned char c : text) {
    const Result result = parser.push(c, now);
    events.frames += result == Result::FrameReady;
    events.rejected += result == Result::Rejected;
    events.links += result == Result::LinkReady;
  }
  return events;
}

std::string frame(const Pixels& pixels, const std::string& eol = "\r\n") {
  std::ostringstream out;
  out << "AMG8831 - grados C:" << eol;
  for (size_t i = 0; i < pixels.size(); ++i) {
    const int64_t magnitude = pixels[i] < 0 ? -int64_t(pixels[i]) : pixels[i];
    out << (pixels[i] < 0 ? "-" : "") << magnitude / 100 << '.'
        << std::setw(2) << std::setfill('0') << magnitude % 100 << ' ';
    if ((i + 1) % 8 == 0) out << eol;
  }
  return out.str();
}

void expectPixels(const Parser& parser, const Pixels& pixels) {
  for (size_t i = 0; i < pixels.size(); ++i) assert(parser.temperatures()[i] == pixels[i]);
}

int main() {
  Pixels sample{};
  for (size_t i = 0; i < sample.size(); ++i) sample[i] = 2000 + int32_t(i) * 25;
  sample[0] = -125;
  sample[1] = -25;
  sample[2] = 0;
  const std::string text = frame(sample);
  const std::string header = "AMG8831 - grados C:\r\n";
  const std::string row = "25.00 25.25 25.50 25.75 26.00 26.25 26.50 26.75\r\n";

  Parser parser;
  assert(feed(parser, "ruido de arranque\r\nTHALOS UART OK\r\n").links == 1);
  // Una trama llega fragmentada entre iteraciones de loop(); aun no hay 64 valores.
  const size_t split = text.size() / 2;
  assert(feed(parser, text.substr(0, split)).frames == 0);
  assert(feed(parser, text.substr(split), 50).frames == 1);
  expectPixels(parser, sample);
  assert(feed(parser, text + text, 100).frames == 2);
  assert(feed(parser, frame(sample, "\n"), 200).frames == 1);
  expectPixels(parser, sample);

  // Incompletos no publican ni borran el ultimo cuadro completo.
  assert(feed(parser, header + row, 300).frames == 0);
  expectPixels(parser, sample);
  assert(!parser.expire(1799));
  assert(parser.expire(1800));
  assert(!parser.expire(1900));
  expectPixels(parser, sample);
  assert(feed(parser, row + row, 1900).frames == 0);
  assert(feed(parser, text, 2000).frames == 1);

  const std::string badRows[] = {
    "25.00 25.00 25.00 25.00 25.00 25.00 25.00\n",
    "25.00 25.00 25.00 25.00 25.00 25.00 25.00 25.00 25.00\n",
    "NaN 25.00 25.00 25.00 25.00 25.00 25.00 25.00\n",
    "25.001 25.00 25.00 25.00 25.00 25.00 25.00 25.00\n",
    "2e1 25.00 25.00 25.00 25.00 25.00 25.00 25.00\n",
    "21474836.48 25.00 25.00 25.00 25.00 25.00 25.00 25.00\n",
    "-21474836.49 25.00 25.00 25.00 25.00 25.00 25.00 25.00\n",
    "25.\r00 25.00 25.00 25.00 25.00 25.00 25.00 25.00\n",
    "\n",
    std::string(200, '9') + "\n",
    std::string("25.00\0 25.00\n", 13),
  };
  for (const std::string& badRow : badRows) {
    const uint32_t before = parser.invalidFrames();
    const Events events = feed(parser, header + badRow, 2100);
    assert(events.frames == 0 && events.rejected == 1);
    assert(parser.invalidFrames() == before + 1);
    expectPixels(parser, sample);
    assert(feed(parser, text, 2200).frames == 1);
    expectPixels(parser, sample);
  }

  // Un encabezado nuevo descarta la trama truncada y permite resincronizar.
  assert(feed(parser, header + row + text, 2300).frames == 1);
  expectPixels(parser, sample);

  // Ceros reales si son validos; nunca se fabrican por faltar datos.
  const Pixels zeros{};
  assert(feed(parser, frame(zeros), 2400).frames == 1);
  expectPixels(parser, zeros);

  // Limites del entero y signo de valores entre -1 y 0 grados.
  Pixels limits = sample;
  limits[0] = INT32_MIN;
  limits[1] = INT32_MAX;
  assert(feed(parser, frame(limits), 2500).frames == 1);
  expectPixels(parser, limits);

  Parser rollover;
  const uint32_t start = 0xfffffff0U;
  feed(rollover, header + row, start);
  assert(!rollover.expire(uint32_t(start + 1499U)));
  assert(rollover.expire(uint32_t(start + 1500U)));
  assert(feed(rollover, text, 2000).frames == 1);
  expectPixels(rollover, sample);

  std::cout << "OK: 64 valores, orden, signos, fragmentacion, cuadros consecutivos, "
               "truncamiento, datos invalidos, desbordamientos y recuperacion.\n";
}

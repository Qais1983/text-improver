#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""يولّد أيقونات PWA والـ favicon بلا اعتماد على مكتبات خارجية.

الموتيف: ورق عاجيّ دافئ يعبره خيط نحاسيّ رفيع يتحوّل إلى عقدة نور — إشارة إلى
سلك الكهرباء الذي عادت به الحياة. تصميم تجريديّ رصين بلا صور ستوك.
"""
import math
import struct
import zlib
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "public"

PAPER = (239, 231, 219)
PAPER_EDGE = (216, 202, 178)
COPPER = (153, 99, 55)
GLOW = (222, 190, 128)


def lerp(a, b, t):
    return tuple(int(round(a[i] + (b[i] - a[i]) * t)) for i in range(3))


def render(size):
    px = bytearray()
    cx = size / 2
    # عقدة النور قرب الوسط الأسفل
    gx, gy = size * 0.5, size * 0.62
    gr = size * 0.16
    for y in range(size):
        px.append(0)  # filter byte per scanline
        for x in range(size):
            # خلفية ورقية مع تدرّج قطريّ خفيف نحو الحواف
            d_edge = math.hypot(x - cx, y - cx) / (size * 0.72)
            base = lerp(PAPER, PAPER_EDGE, min(1.0, d_edge ** 1.6))

            # الخيط العموديّ المتموّج
            wave = cx + math.sin(y / size * math.pi * 2.0) * size * 0.05
            dist_thread = abs(x - wave)
            thread_w = size * 0.012
            col = list(base)
            if dist_thread < thread_w * 3:
                # يشتدّ لونه في النصف الأعلى ويذوب قرب العقدة
                fade_top = max(0.0, 1.0 - y / (size * 0.66))
                a = max(0.0, 1.0 - dist_thread / (thread_w * 3)) * (0.25 + 0.75 * fade_top)
                col = list(lerp(tuple(col), COPPER, a))

            # عقدة النور
            dg = math.hypot(x - gx, y - gy) / gr
            if dg < 2.2:
                a = math.exp(-(dg * dg) * 1.15)
                col = list(lerp(tuple(col), GLOW, min(1.0, a)))
                # قلب ساطع
                if dg < 0.5:
                    col = list(lerp(tuple(col), (245, 224, 178), 1 - dg / 0.5))

            px.extend(col)
    raw = bytes(px)

    def chunk(tag, data):
        c = struct.pack(">I", len(data)) + tag + data
        return c + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)

    sig = b"\x89PNG\r\n\x1a\n"
    ihdr = struct.pack(">IIBBBBB", size, size, 8, 2, 0, 0, 0)  # 8-bit RGB
    idat = zlib.compress(raw, 9)
    return sig + chunk(b"IHDR", ihdr) + chunk(b"IDAT", idat) + chunk(b"IEND", b"")


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    for size, name in [(192, "icon-192.png"), (512, "icon-512.png"), (180, "apple-touch-icon.png")]:
        (OUT / name).write_bytes(render(size))
        print("كتب", name)

    # favicon.svg متجهيّ خفيف يطابق الموتيف
    svg = """<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 64 64\">
  <defs>
    <radialGradient id=\"g\" cx=\"50%\" cy=\"62%\" r=\"40%\">
      <stop offset=\"0%\" stop-color=\"#f5e0b2\"/>
      <stop offset=\"55%\" stop-color=\"#debe80\"/>
      <stop offset=\"100%\" stop-color=\"#debe80\" stop-opacity=\"0\"/>
    </radialGradient>
  </defs>
  <rect width=\"64\" height=\"64\" rx=\"12\" fill=\"#efe7db\"/>
  <path d=\"M32 4 C 34 18, 27 26, 32 36\" fill=\"none\" stroke=\"#996337\" stroke-width=\"1.8\" stroke-linecap=\"round\"/>
  <circle cx=\"32\" cy=\"40\" r=\"16\" fill=\"url(#g)\"/>
  <circle cx=\"32\" cy=\"40\" r=\"3\" fill=\"#f5e0b2\"/>
</svg>
"""
    (OUT / "favicon.svg").write_text(svg, encoding="utf-8")
    print("كتب favicon.svg")


if __name__ == "__main__":
    main()

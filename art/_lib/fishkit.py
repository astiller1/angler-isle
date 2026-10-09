"""Parametric cartoon fish. Head points to -Y, length is normalised to 1.0 m (the game scales by weight).

spec keys
  height, width       body proportions relative to length
  taper               how strongly the body thins toward the tail (0..1)
  top, bottom         body colors (vertical gradient)
  pattern             None | "hstripes" | "vstripes" | "spots" | "bars"
  pattern_color, pattern_n
  fin                 fin color
  tail                "fork" | "round" | "lunate"
  dorsal              "small" | "long" | "spiky" | "sail"
  eye                 eye size factor
  jaw                 "normal" | "under" (protruding lower jaw) | "lips"
"""
import math

from kit import MB, obj_from
from palette import mix


def _clamp(x, a=0.0, b=1.0):
    return max(a, min(b, x))


def build_fish(spec, name="fish"):
    L = 1.0
    H = spec.get("height", 0.32)
    W = spec.get("width", 0.16)
    taper = spec.get("taper", 0.75)
    top, bottom = spec["top"], spec["bottom"]
    pat = spec.get("pattern")
    pc = spec.get("pattern_color", "white")
    pn = spec.get("pattern_n", 4)
    fin = spec.get("fin", top)

    def body_color(co):
        t = _clamp((co.z / (H / 2) + 1) / 2)  # 0 bottom .. 1 top
        c = mix(bottom, top, t ** 0.8)
        u = (co.y + L / 2) / L  # 0 head .. 1 tail
        if pat == "hstripes":
            if math.sin((co.z / H) * math.pi * pn * 1.6) > 0.55 and 0.12 < u < 0.92:
                c = mix(c, pc, 0.85)
        elif pat == "vstripes" or pat == "bars":
            w = 0.5 if pat == "vstripes" else 0.15
            if math.sin(u * math.pi * pn * 2) > w and 0.18 < u < 0.85 and t > 0.25:
                c = mix(c, pc, 0.85)
        elif pat == "spots":
            s = math.sin(co.y * 47.0) * math.sin(co.z * 53.0 + co.x * 9.0)
            if s > 0.62 and 0.1 < u < 0.9:
                c = mix(c, pc, 0.9)
        return c

    mb = MB()
    # body: uv-sphere, then tapered toward the tail
    verts = mb.sphere(0.5, (0, 0, 0), scale=(W, L, H), color=top, seg=16, rings=12)
    for v in verts:
        u = (v.co.y + L / 2) / L
        if u > 0.45:
            k = 1 - taper * ((u - 0.45) / 0.55) ** 1.4
            v.co.x *= k
            v.co.z = v.co.z * k + spec.get("tail_lift", 0.0) * (u - 0.45)
        else:
            # blunt the head a bit
            k = 1 - 0.12 * ((0.45 - u) / 0.45) ** 2
            v.co.x *= k
        if spec.get("flat_belly") and v.co.z < 0:
            v.co.z *= 0.7
    mb.recolor(verts, body_color)

    # tail fin
    ty = L / 2 - 0.04
    th = H * spec.get("tail_size", 0.85)
    tail = spec.get("tail", "fork")
    if tail == "fork":
        pts = [(0, ty, 0.02), (0, ty + 0.26, th * 0.62), (0, ty + 0.17, 0), (0, ty + 0.26, -th * 0.62), (0, ty, -0.02)]
    elif tail == "lunate":
        pts = [(0, ty, 0.02), (0, ty + 0.2, th * 0.75), (0, ty + 0.12, th * 0.15), (0, ty + 0.11, -th * 0.15), (0, ty + 0.2, -th * 0.75), (0, ty, -0.02)]
    else:
        pts = [(0, ty, 0.03), (0, ty + 0.12, th * 0.42), (0, ty + 0.22, th * 0.25), (0, ty + 0.24, 0), (0, ty + 0.22, -th * 0.25), (0, ty + 0.12, -th * 0.42), (0, ty, -0.03)]
    mb.poly(pts, color=fin, both_sides=True)

    # dorsal fin
    dz = H / 2 - 0.02
    dorsal = spec.get("dorsal", "small")
    if dorsal == "small":
        d = [(0, -0.08, dz), (0, 0.02, dz + H * 0.32), (0, 0.18, dz - 0.02)]
    elif dorsal == "long":
        d = [(0, -0.2, dz - 0.01), (0, -0.12, dz + H * 0.3), (0, 0.2, dz + H * 0.18), (0, 0.3, dz - 0.06)]
    elif dorsal == "spiky":
        d = [(0, -0.2, dz - 0.01)]
        for k in range(6):
            y = -0.17 + k * 0.07
            d += [(0, y, dz + H * (0.42 if k % 2 == 0 else 0.22))]
        d += [(0, 0.26, dz - 0.05)]
    else:  # sail
        d = [(0, -0.22, dz - 0.02), (0, -0.1, dz + H * 0.9), (0, 0.15, dz + H * 0.55), (0, 0.28, dz - 0.06)]
    mb.poly(d, color=fin, both_sides=True)
    # belly fin
    bz = -H / 2 + 0.03
    mb.poly([(0, 0.05, bz), (0, 0.16, bz - H * 0.22), (0, 0.24, bz + 0.01)], color=fin, both_sides=True)
    # pectoral fins
    for sx in (-1, 1):
        x = sx * W * 0.45
        mb.poly([(x, -0.2, -0.02), (x + sx * 0.06, -0.06, -H * 0.18), (x + sx * 0.02, -0.08, 0.02)], color=fin, both_sides=True)

    # eyes
    er = H * 0.13 * spec.get("eye", 1.0)
    for sx in (-1, 1):
        ex, ey, ez = sx * W * 0.4, -L * 0.36, H * 0.1
        mb.sphere(er, (ex, ey, ez), scale=(0.6, 1, 1), color="white", seg=10, rings=8)
        mb.sphere(er * 0.6, (ex + sx * er * 0.35, ey - er * 0.15, ez), scale=(0.6, 1, 1), color="eye", seg=8, rings=6)
    # mouth / jaw
    jaw = spec.get("jaw", "normal")
    if jaw == "under":
        mb.box((W * 0.45, 0.1, H * 0.1), (0, -L / 2 + 0.01, -H * 0.12), rot=(0.25, 0, 0), color=bottom)
    elif jaw == "lips":
        mb.sphere(H * 0.12, (0, -L / 2 + 0.02, -H * 0.05), scale=(1.3, 0.6, 0.9), color=spec.get("lip_color", "pink"), seg=8, rings=6)
    else:
        mb.box((W * 0.35, 0.02, 0.012), (0, -L / 2 + 0.03, -H * 0.08), color="eye")
    return obj_from(mb, name)

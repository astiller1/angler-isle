"""Building blocks for wooden island architecture: decks, stilts, railings, stairs, walls, roofs.

`B` bundles a visual builder (mb) and a collision builder (cb). Call `B.finish(name)` to create the
visual object plus one merged COL_<name> object. Coordinates: Blender, Z up, front = -Y.
Deck tops are at z = 0 unless noted, so placing the model at a height h puts the floor at h.
"""
import math

from kit import MB, obj_from, rng
from palette import mix


class B:
    def __init__(self, seed=1):
        self.mb = MB()
        self.cb = MB()
        self.r = rng(seed)

    # ------------------------------------------------------------------ collision
    def col(self, size, loc, rot=(0, 0, 0)):
        self.cb.box(size, loc, rot, color="col")

    def finish(self, name, origin=(0, 0, 0)):
        o = obj_from(self.mb, name, origin=origin)
        if len(self.cb.bm.verts):
            obj_from(self.cb, "COL_" + name, origin=origin)
        else:
            self.cb.bm.free()
        return o

    # ------------------------------------------------------------------ wood
    def deck(self, x0, x1, y0, y1, z=0.0, along="y", plank=0.32, thick=0.1, color="plank", collide=True):
        """Plank floor whose top is at z. Planks run along `along`."""
        if along == "y":
            n = max(1, int((x1 - x0) / plank))
            w = (x1 - x0) / n
            for i in range(n):
                c = mix(color, "plank_dark", self.r.uniform(0, 0.35))
                self.mb.box((w * 0.94, y1 - y0, thick), (x0 + w * (i + 0.5), (y0 + y1) / 2, z - thick / 2), color=c)
        else:
            n = max(1, int((y1 - y0) / plank))
            w = (y1 - y0) / n
            for i in range(n):
                c = mix(color, "plank_dark", self.r.uniform(0, 0.35))
                self.mb.box((x1 - x0, w * 0.94, thick), ((x0 + x1) / 2, y0 + w * (i + 0.5), z - thick / 2), color=c)
        # beams under the deck
        if collide:
            self.col((x1 - x0, y1 - y0, 0.4), ((x0 + x1) / 2, (y0 + y1) / 2, z - 0.2))

    def post(self, x, y, z_top, z_bottom, r=0.12, color="wood_dark", collide=False):
        self.mb.cyl(r, z_top - z_bottom, (x, y, (z_top + z_bottom) / 2), color=color, seg=6)
        if collide:
            self.col((r * 2, r * 2, z_top - z_bottom), (x, y, (z_top + z_bottom) / 2))

    def stilts(self, x0, x1, y0, y1, z_top, z_bottom=-6.0, spacing=3.0, r=0.13):
        nx = max(1, round((x1 - x0) / spacing))
        ny = max(1, round((y1 - y0) / spacing))
        for i in range(nx + 1):
            for j in range(ny + 1):
                self.post(x0 + (x1 - x0) * i / nx, y0 + (y1 - y0) * j / ny, z_top - 0.1, z_bottom, r)

    def railing(self, p0, p1, z=0.0, h=0.9, spacing=1.6, color="wood", collide=True, rope=False):
        (x0, y0), (x1, y1) = p0, p1
        length = math.hypot(x1 - x0, y1 - y0)
        n = max(1, round(length / spacing))
        ang = math.atan2(y1 - y0, x1 - x0)
        for i in range(n + 1):
            t = i / n
            self.mb.box((0.1, 0.1, h), (x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, z + h / 2), rot=(0, 0, ang), color=color)
        cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
        if rope:
            self.mb.box((length, 0.04, 0.04), (cx, cy, z + h * 0.85), rot=(0, 0, ang), color="rope")
        else:
            self.mb.box((length + 0.1, 0.12, 0.07), (cx, cy, z + h), rot=(0, 0, ang), color="wood_light")
            self.mb.box((length, 0.06, 0.06), (cx, cy, z + h * 0.5), rot=(0, 0, ang), color=color)
        if collide:
            self.col((length, 0.2, 1.4), (cx, cy, z + 0.7), rot=(0, 0, ang))

    def stairs(self, x, y, z_bottom, z_top, direction, width=1.2, step_rise=0.2, color="plank", rails=True):
        """Straight stairs going UP along `direction` ((1,0),(0,1),...) starting at (x, y, z_bottom)."""
        dx, dy = direction
        rise = z_top - z_bottom
        n = max(2, round(rise / step_rise))
        run_len = n * 0.3
        for i in range(n):
            cz = z_bottom + rise * (i + 1) / n
            cx = x + dx * (i + 0.5) * 0.3
            cy = y + dy * (i + 0.5) * 0.3
            size = (0.3 if dx else width, 0.3 if dy else width, 0.07)
            self.mb.box(size, (cx, cy, cz - 0.035), color=mix(color, "plank_dark", self.r.uniform(0, 0.3)))
        # stringers
        ang = math.atan2(rise, run_len)
        L = math.hypot(rise, run_len)
        mx, my, mz = x + dx * run_len / 2, y + dy * run_len / 2, z_bottom + rise / 2 - 0.08
        for side in (-1, 1):
            ox, oy = (0, side * width / 2) if dx else (side * width / 2, 0)
            if dx:
                self.mb.box((L, 0.08, 0.22), (mx + ox, my + oy, mz), rot=(0, -ang * dx, 0), color="wood_dark")
            else:
                self.mb.box((0.08, L, 0.22), (mx + ox, my + oy, mz), rot=(ang * dy, 0, 0), color="wood_dark")
        # ramp collision (smooth to walk on)
        if dx:
            self.col((L + 0.3, width, 0.12), (mx, my, z_bottom + rise / 2 - 0.02), rot=(0, -ang * dx, 0))
        else:
            self.col((width, L + 0.3, 0.12), (mx, my, z_bottom + rise / 2 - 0.02), rot=(ang * dy, 0, 0))
        if rails:
            for side in (-1, 1):
                ox, oy = (0, side * (width / 2 + 0.05)) if dx else (side * (width / 2 + 0.05), 0)
                p0 = (x + ox, y + oy)
                p1 = (x + dx * run_len + ox, y + dy * run_len + oy)
                # sloped hand rail
                self.mb.box((0.08, 0.08, 0.95), (p0[0], p0[1], z_bottom + 0.47), color="wood")
                self.mb.box((0.08, 0.08, 0.95), (p1[0], p1[1], z_top + 0.47), color="wood")
                if dx:
                    self.mb.box((L, 0.08, 0.08), ((p0[0] + p1[0]) / 2, p0[1], z_bottom + rise / 2 + 0.92), rot=(0, -ang * dx, 0), color="wood_light")
                    self.col((L, 0.15, 1.2), ((p0[0] + p1[0]) / 2, p0[1], z_bottom + rise / 2 + 0.6), rot=(0, -ang * dx, 0))
                else:
                    self.mb.box((0.08, L, 0.08), (p0[0], (p0[1] + p1[1]) / 2, z_bottom + rise / 2 + 0.92), rot=(ang * dy, 0, 0), color="wood_light")
                    self.col((0.15, L, 1.2), (p0[0], (p0[1] + p1[1]) / 2, z_bottom + rise / 2 + 0.6), rot=(ang * dy, 0, 0))
        return run_len

    # ------------------------------------------------------------------ walls & roofs
    def wall(self, a, b, z0, z1, axis="x", at=0.0, t=0.14, color="wall_white", openings=(), collide=True, trim="trim"):
        """Wall from a to b along `axis` ('x' or 'y') at the other coordinate `at`.
        openings: list of (start, end, bottom, top) along the wall axis, e.g. doors/windows."""
        ops = sorted(openings)
        cuts = [a]
        for s, e, _, _ in ops:
            cuts += [s, e]
        cuts.append(b)

        def box(s, e, zb, zt, c=color, col=True):
            if e - s < 1e-3 or zt - zb < 1e-3:
                return
            mid = (s + e) / 2
            size = (e - s, t, zt - zb) if axis == "x" else (t, e - s, zt - zb)
            loc = (mid, at, (zb + zt) / 2) if axis == "x" else (at, mid, (zb + zt) / 2)
            self.mb.box(size, loc, color=c)
            if collide and col:
                self.col(size, loc)

        for i in range(0, len(cuts), 2):
            box(cuts[i], cuts[i + 1], z0, z1)
        for s, e, ob, ot in ops:
            box(s, e, z0, ob)
            box(s, e, ot, z1)
            # frame
            fl = 0.09
            for zz in (ob, ot):
                if zz > z0 + 0.01:
                    size = (e - s + 0.18, t + 0.06, fl) if axis == "x" else (t + 0.06, e - s + 0.18, fl)
                    loc = ((s + e) / 2, at, zz) if axis == "x" else (at, (s + e) / 2, zz)
                    self.mb.box(size, loc, color=trim)
            for ss in (s, e):
                size = (fl, t + 0.06, ot - ob) if axis == "x" else (t + 0.06, fl, ot - ob)
                loc = (ss, at, (ob + ot) / 2) if axis == "x" else (at, ss, (ob + ot) / 2)
                self.mb.box(size, loc, color=trim)
            if ob > z0 + 0.3:  # window: glass pane + shutters
                size = (e - s, 0.03, ot - ob) if axis == "x" else (0.03, e - s, ot - ob)
                loc = ((s + e) / 2, at, (ob + ot) / 2) if axis == "x" else (at, (s + e) / 2, (ob + ot) / 2)
                self.mb.box(size, loc, color="window")
                if collide:
                    self.col((size[0], 0.1, size[2]) if axis == "x" else (0.1, size[1], size[2]), loc)

    def gable_roof(self, cx, cy, w, d, z_eave, rise, color="roof_red", overhang=0.35, ridge_axis="x", thick=0.12):
        """Two sloped slabs. ridge_axis 'x' means the ridge runs along X (slopes face ±Y)."""
        if ridge_axis == "x":
            half = d / 2 + overhang
            ang = math.atan2(rise, d / 2)
            L = math.hypot(half, rise * half / (d / 2))
            for s in (-1, 1):
                self.mb.box((w + overhang * 2, L, thick), (cx, cy + s * half / 2, z_eave + rise / 2 - (overhang * rise / (d / 2)) / 2), rot=(s * -ang, 0, 0), color=color)
            # gable triangles
            for s in (-1, 1):
                self.mb.poly([(cx + s * w / 2, cy - d / 2, z_eave), (cx + s * w / 2, cy + d / 2, z_eave), (cx + s * w / 2, cy, z_eave + rise)],
                             color=mix(color, "#FFFFFF", 0.55), both_sides=True)
            self.mb.box((w + overhang * 2 + 0.05, 0.16, 0.16), (cx, cy, z_eave + rise + 0.02), color=mix(color, "#000000", 0.2))
        else:
            half = w / 2 + overhang
            ang = math.atan2(rise, w / 2)
            L = math.hypot(half, rise * half / (w / 2))
            for s in (-1, 1):
                self.mb.box((L, d + overhang * 2, thick), (cx + s * half / 2, cy, z_eave + rise / 2 - (overhang * rise / (w / 2)) / 2), rot=(0, s * ang, 0), color=color)
            for s in (-1, 1):
                self.mb.poly([(cx - w / 2, cy + s * d / 2, z_eave), (cx + w / 2, cy + s * d / 2, z_eave), (cx, cy + s * d / 2, z_eave + rise)],
                             color=mix(color, "#FFFFFF", 0.55), both_sides=True)
            self.mb.box((0.16, d + overhang * 2 + 0.05, 0.16), (cx, cy, z_eave + rise + 0.02), color=mix(color, "#000000", 0.2))
        # rough roof collision box so the camera does not clip through
        self.col((w + overhang, d + overhang, rise * 0.7), (cx, cy, z_eave + rise * 0.35))

    def awning(self, x0, x1, y_wall, depth, z_top, drop=0.5, colors=("awning_a", "awning_b"), stripe=0.5):
        n = max(1, round((x1 - x0) / stripe))
        w = (x1 - x0) / n
        ang = math.atan2(drop, depth)
        L = math.hypot(depth, drop)
        for i in range(n):
            self.mb.box((w, L, 0.05), (x0 + w * (i + 0.5), y_wall - depth / 2, z_top - drop / 2), rot=(-ang, 0, 0), color=colors[i % 2])
            # scalloped edge
            cx, ey, ez = x0 + w * (i + 0.5), y_wall - depth, z_top - drop
            self.mb.poly([(cx - w / 2, ey, ez), (cx + w / 2, ey, ez), (cx, ey, ez - w * 0.4)], color=colors[i % 2], both_sides=True)

    # ------------------------------------------------------------------ small props baked into buildings
    def crate(self, x, y, z, s=0.6, color="crate", collide=True):
        self.mb.box((s, s, s), (x, y, z + s / 2), color=color)
        for k in (-1, 1):
            self.mb.box((s + 0.02, 0.06, s * 0.9), (x, y + k * s * 0.3, z + s / 2), color="wood_dark")
        if collide:
            self.col((s, s, s), (x, y, z + s / 2))

    def barrel(self, x, y, z, r=0.32, h=0.8, color="wood", collide=True):
        self.mb.cyl(r, h, (x, y, z + h / 2), color=color, seg=10, smooth=True)
        for zz in (0.18, 0.62):
            self.mb.cyl(r * 1.03, 0.05, (x, y, z + h * zz + 0.02), color="metal", seg=10)
        if collide:
            self.col((r * 2, r * 2, h), (x, y, z + h / 2))

    def lantern_post(self, x, y, z, h=2.2):
        self.mb.cyl(0.06, h, (x, y, z + h / 2), color="wood_dark", seg=6)
        self.mb.box((0.35, 0.05, 0.05), (x + 0.15, y, z + h), color="wood_dark")
        self.mb.box((0.18, 0.18, 0.24), (x + 0.3, y, z + h - 0.18), color="flower_yellow")
        self.mb.cyl(0.13, 0.06, (x + 0.3, y, z + h - 0.03), color="black", seg=4, r2=0.02)
        self.col((0.15, 0.15, h), (x, y, z + h / 2))

    def bollard(self, x, y, z):
        self.mb.cyl(0.14, 0.4, (x, y, z + 0.2), color="black", seg=8)
        self.mb.cyl(0.18, 0.06, (x, y, z + 0.42), color="black", seg=8)
        self.col((0.3, 0.3, 0.5), (x, y, z + 0.25))

    def flower_box(self, x, y, z, w=1.0, axis="x"):
        size = (w, 0.22, 0.2) if axis == "x" else (0.22, w, 0.2)
        self.mb.box(size, (x, y, z), color="wood_light")
        for k in range(int(w / 0.18)):
            t = -w / 2 + 0.09 + k * 0.18
            px, py = (x + t, y) if axis == "x" else (x, y + t)
            self.mb.sphere(0.07, (px, py, z + 0.14), color=self.r.choice(["flower_red", "flower_yellow", "flower_pink"]), seg=6, rings=4)
            self.mb.sphere(0.06, (px + 0.05, py, z + 0.1), color="palm_leaf", seg=6, rings=4)

    def sign(self, text, x, y, z, w=2.2, h=0.55, face=-1, color="sign", text_color="wood_dark", size=0.26):
        from kit import text_mesh
        self.mb.box((w, 0.08, h), (x, y, z), color=color)
        self.mb.box((w + 0.1, 0.06, 0.06), (x, y, z + h / 2), color="wood_dark")
        self.mb.box((w + 0.1, 0.06, 0.06), (x, y, z - h / 2), color="wood_dark")
        rot = (math.pi / 2, 0, 0) if face < 0 else (math.pi / 2, 0, math.pi)
        text_mesh(self.mb, text, (x, y + face * 0.05, z), size=size, color=text_color, rot=rot)

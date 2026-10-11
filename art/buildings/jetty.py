"""Small boat jetty ("Anlegestelle"): 2 m wide, 13 m deck out into the water along -Y, short stairs up from
the shore at +Y. Deck top = origin (placed ~0.8 m above the ground where the stairs begin). The game moors
the rowboat on the +X side of the deck end (see src/data/boat.ts)."""
import os, sys; sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "_lib"))
from kit import *
from structures import B

LEN = 13.0


def build():
    b = B(23)
    b.deck(-1.0, 1.0, -LEN, 0, 0, along="x")
    b.stairs(0, 1.2, -0.8, 0, (0, -1), width=1.8, rails=False)
    for y in range(0, -int(LEN) - 1, -3):
        for x in (-0.95, 0.95):
            b.post(x, y, 0.35 if y in (0, -12) else -0.05, -4, r=0.12)
    b.skirt([(-1.0, 0), (-1.0, -LEN), (1.0, -LEN), (1.0, 0)], z_bottom=-4)
    b.railing((-1.0, -0.5), (-1.0, -LEN), rope=True, spacing=2.6)
    b.bollard(0.7, -LEN + 0.4, 0)
    b.bollard(0.7, -LEN + 5.5, 0)
    b.lantern_post(-0.85, -LEN + 0.4, 0)
    # anchor sign at the shore end
    b.mb.cyl(0.05, 1.6, (-1.25, 0.6, 0.0), color="wood_dark", seg=6)
    b.mb.box((0.06, 0.62, 0.5), (-1.25, 0.6, 0.85), color="sign")
    b.mb.cyl(0.05, 0.3, (-1.22, 0.6, 0.88), color="cap_blue", seg=8)  # anchor shaft
    b.mb.box((0.04, 0.3, 0.05), (-1.22, 0.6, 0.98), color="cap_blue")
    b.mb.cyl(0.13, 0.04, (-1.22, 0.6, 0.73), rot=(1.5708, 0, 0), color="cap_blue", seg=10, r2=0.13)
    # rope coil and a buoy
    b.mb.cyl(0.2, 0.06, (-0.5, -LEN + 1.2, 0.03), color="rope", seg=10)
    b.mb.sphere(0.16, (1.08, -LEN + 3.0, -0.25), color="red", seg=8, rings=6)
    b.finish("jetty")


run(build, __file__)

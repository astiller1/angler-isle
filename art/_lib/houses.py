"""Colorful Caribbean stilt houses. z = 0 is the ground at the model origin; the floor sits on stilts."""
from structures import B

W, D = 5.0, 4.5          # house footprint
FLOOR = 1.6              # floor height above ground
WALL_H = 2.5
PORCH = 1.6              # porch depth in front (-Y)


def stilt_house(seed, wall, roof, trim="trim", two_story=False, name="house"):
    b = B(seed)
    x0, x1, y0, y1 = -W / 2, W / 2, -D / 2, D / 2
    top = FLOOR + WALL_H
    porch_x1 = x1 + (1.4 if two_story else 0)

    # stilts + floor + porch
    b.stilts(x0, x1, y0, y1, FLOOR, -1.5, spacing=2.5, r=0.14)
    b.stilts(x0, porch_x1, y0 - PORCH, y0 - PORCH, FLOOR, -1.5, spacing=2.5, r=0.12)
    b.deck(x0 - 0.1, x1 + 0.1, y0, y1 + 0.1, FLOOR, along="y", color="plank")
    b.deck(x0 - 0.1, porch_x1, y0 - PORCH, y0, FLOOR, along="x", color="plank")
    # nobody gets stuck under the house
    b.skirt([(x0 - 0.1, y0 - PORCH), (porch_x1, y0 - PORCH), (porch_x1, y0), (x1 + 0.1, y0), (x1 + 0.1, y1 + 0.1),
             (x0 - 0.1, y1 + 0.1), (x0 - 0.1, y0 - PORCH)], z_top=FLOOR - 0.12, z_bottom=-1.5)

    # front stairs (ground -> porch)
    run = b.stairs(-0.0, y0 - PORCH - 2.4, 0.0, FLOOR, (0, 1), width=1.3)
    del run
    b.railing((x0 - 0.05, y0 - PORCH), (-0.75, y0 - PORCH), FLOOR, h=0.85)
    b.railing((0.75, y0 - PORCH), (porch_x1, y0 - PORCH), FLOOR, h=0.85)
    b.railing((x0 - 0.05, y0 - PORCH), (x0 - 0.05, y0), FLOOR, h=0.85)
    if not two_story:
        b.railing((x1 + 0.05, y0 - PORCH), (x1 + 0.05, y0), FLOOR, h=0.85)

    # walls (door front, windows sides/back)
    b.wall(x0, x1, FLOOR, top, axis="x", at=y0, color=wall, trim=trim, openings=[(-0.6, 0.6, FLOOR, FLOOR + 2.05), (1.15, 2.05, FLOOR + 0.9, FLOOR + 1.8), (-2.05, -1.15, FLOOR + 0.9, FLOOR + 1.8)])
    b.wall(x0, x1, FLOOR, top, axis="x", at=y1, color=wall, trim=trim, openings=[(-0.6, 0.6, FLOOR + 0.9, FLOOR + 1.8)])
    b.wall(y0, y1, FLOOR, top, axis="y", at=x0, color=wall, trim=trim, openings=[(-0.6, 0.6, FLOOR + 0.9, FLOOR + 1.8)])
    b.wall(y0, y1, FLOOR, top, axis="y", at=x1, color=wall, trim=trim, openings=[(-0.6, 0.6, FLOOR + 0.9, FLOOR + 1.8)])
    b.flower_box(1.6, y0 - 0.18, FLOOR + 0.82, w=1.0)
    b.flower_box(-1.6, y0 - 0.18, FLOOR + 0.82, w=1.0)
    # interior bits
    b.mb.box((1.6, 0.8, 0.45), (-1.3, 1.6, FLOOR + 0.22), color="wall_white")   # bed
    b.mb.box((1.6, 0.25, 0.5), (-1.3, 2.05, FLOOR + 0.5), color="wood")
    b.mb.box((0.25, 0.8, 0.12), (-1.3, 1.6, FLOOR + 0.5), color=roof)            # blanket
    b.mb.cyl(0.45, 0.06, (1.2, 0.8, FLOOR + 0.75), color="wood_light", seg=10)    # table
    b.mb.cyl(0.07, 0.75, (1.2, 0.8, FLOOR + 0.37), color="wood", seg=6)

    if not two_story:
        b.gable_roof(0, 0, W, D, top, 1.4, color=roof, ridge_axis="y", overhang=0.4)
        # porch roof
        b.mb.box((W + 0.4, PORCH + 0.3, 0.08), (0, y0 - PORCH / 2, top - 0.2), rot=(-0.12, 0, 0), color=roof)
        for sx in (x0, x1):
            b.post(sx, y0 - PORCH + 0.1, top - 0.2, FLOOR)
    else:
        # flat roof terrace reachable by side stairs
        T = top + 0.12
        b.deck(x0 - 0.1, x1 + 0.1, y0 - 0.1, y1 + 0.1, T, along="x", color="plank")
        b.deck(x1 + 0.1, x1 + 1.5, y1 - 0.75, y1 + 0.1, T, along="x", color="plank")
        b.stilts(x1 + 1.45, x1 + 1.45, y1 - 0.7, y1 - 0.7, T, FLOOR, spacing=1)
        b.stairs(x1 + 0.75, y0, FLOOR, T, (0, 1), width=1.2)
        b.railing((x0 - 0.1, y0 - 0.1), (x1 + 0.1, y0 - 0.1), T, h=0.9)
        b.railing((x0 - 0.1, y0 - 0.1), (x0 - 0.1, y1 + 0.1), T, h=0.9)
        b.railing((x0 - 0.1, y1 + 0.1), (x1 + 1.5, y1 + 0.1), T, h=0.9)
        b.railing((x1 + 1.5, y1 - 0.75), (x1 + 1.5, y1 + 0.1), T, h=0.9)
        b.railing((x1 + 0.1, y0 - 0.1), (x1 + 0.1, y1 - 0.75), T, h=0.9, collide=True)
        # pergola with a striped canopy on the back half
        for px, py in ((x0 + 0.2, 0.2), (0.6, 0.2), (x0 + 0.2, y1 - 0.1), (0.6, y1 - 0.1)):
            b.post(px, py, T + 2.1, T, r=0.07, color="wood")
        b.awning(x0 + 0.1, 0.7, y1 + 0.05, y1 - 0.05, T + 2.2, drop=0.3, colors=(roof, "awning_b"))
        b.mb.box((1.4, 0.5, 0.35), (x0 + 1.0, 1.6, T + 0.18), color="wood_light")      # bench
        b.mb.cyl(0.35, 0.05, (-0.3, 1.0, T + 0.6), color="wood", seg=10)                # little table
        b.mb.cyl(0.05, 0.6, (-0.3, 1.0, T + 0.3), color="wood", seg=6)
        b.mb.sphere(0.12, (-0.3, 1.0, T + 0.72), color="coconut", seg=8, rings=6)
        # parapet trim
        b.mb.box((W + 0.3, D + 0.3, 0.1), (0, 0, top + 0.05), color=trim)
    return b

"""Pelle, the pelican fish trader at the harbor."""
import os, sys; sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "_lib"))
from kit import *
from animals import *


def accessories(ctx):
    hz, r, fy = ctx["head_z"], ctx["head_r"], ctx["fy"]
    mb = MB()
    # long beak + pouch
    mb.box((r * 0.42, r * 1.9, r * 0.14), (0, fy - r * 0.8, hz - r * 0.12), rot=(0.08, 0, 0), color="beak")
    mb.sphere(r * 0.42, (0, fy - r * 0.75, hz - r * 0.38), scale=(0.75, 1.9, 0.8), color="beak_pouch", seg=12, rings=8)
    mb.sphere(r * 0.1, (0, fy - r * 1.72, hz - r * 0.16), color="beak", seg=8, rings=6)
    add_to(ctx["head"], "beak", mb, (0, fy, hz))
    # merchant visor
    mb = MB()
    top = hz + r * 0.62
    mb.cyl(r * 0.9, 0.05, (0, 0, top), color="roof_teal", seg=16)
    mb.box((r * 1.2, r * 0.8, 0.03), (0, -r * 0.95, top - 0.01), rot=(-0.2, 0, 0), color="roof_teal")
    add_to(ctx["head"], "hat", mb, (0, 0, top))
    # tail feathers
    mb = MB()
    by = ctx["body_r"] * ctx["body_scale"][1]
    mb.box((0.18, 0.16, 0.04), (0, by + 0.04, ctx["body_z"] - 0.08), rot=(-0.5, 0, 0), color="pelican_grey")
    add_to(ctx["body"], "feathers", mb, (0, by, ctx["body_z"]))


SPEC = dict(
    fur="pelican", light="pelican", paw="beak", body_color="pelican",
    hip=0.3, leg_len=0.3, leg_r=0.045, leg_x=0.11, body_r=0.3, body_scale=(0.95, 1.1, 1.05), belly=False,
    head_r=0.22, head_scale=(1.0, 1.05, 1.0), muzzle="none", ears="none", blush=False,
    eye_size=0.17, eye_spread=0.45, eye_z=0.15,
    arm_len=0.3, arm_r=0.09, arm_color="pelican_grey", tail="none", accessories=accessories,
)

run(lambda: build_animal(SPEC), __file__)

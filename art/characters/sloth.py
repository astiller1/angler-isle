"""Fritzi, the sleepy sloth who lives in a hammock by the mangroves (neighbor)."""
import os, sys; sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "_lib"))
from kit import *
from animals import *


def accessories(ctx):
    # tiny flower behind the ear
    mb = MB()
    hz, r = ctx["head_z"], ctx["head_r"]
    p = (r * 0.75, 0.0, hz + r * 0.45)
    for k in range(5):
        a = k / 5 * math.tau
        mb.sphere(0.035, (p[0] + math.cos(a) * 0.04, p[1] - 0.02, p[2] + math.sin(a) * 0.04), color="flower_pink", seg=6, rings=4)
    mb.sphere(0.03, (p[0], p[1] - 0.04, p[2]), color="flower_yellow", seg=6, rings=4)
    add_to(ctx["head"], "flower", mb, p)


SPEC = dict(
    fur="sloth", light="sloth_light", paw="sloth_mask", head_color="sloth_light",
    hip=0.22, body_r=0.3, body_scale=(1.0, 0.95, 1.15),
    head_r=0.27, head_scale=(1.1, 1.0, 0.95), muzzle="small", nose_color="sloth_mask", ears="none",
    mask="sloth_mask", sleepy=True, eye_size=0.15, eye_spread=0.36,
    arm_len=0.42, arm_r=0.06, leg_r=0.075, tail="stub", accessories=accessories,
)

run(lambda: build_animal(SPEC), __file__)

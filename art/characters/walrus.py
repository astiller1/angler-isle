"""Opa Walter, the old walrus fisherman at the end of the pier (neighbor)."""
import os, sys; sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "_lib"))
from kit import *
from animals import *


def accessories(ctx):
    cap(ctx, "cap_blue", "cap_blue")
    # yellow rain jacket collar
    mb = MB()
    z = ctx["neck_z"] - 0.02
    mb.cyl(ctx["body_r"] * 0.86, 0.1, (0, 0, z), color="shirt_yellow", seg=16)
    add_to(ctx["body"], "collar", mb, (0, 0, z))


SPEC = dict(
    fur="walrus", light="walrus_light", paw="walrus", body_color="shirt_yellow",
    hip=0.16, leg_len=0.08, leg_r=0.1, body_r=0.4, body_scale=(1.1, 1.0, 1.0), belly=False,
    head_r=0.32, head_scale=(1.15, 1.0, 0.9), muzzle="walrus", nose_color="#5A3B2E", ears="none",
    whiskers=True, whisker_color="#F5E6D0", eye_size=0.13, eye_spread=0.36, eye_z=0.22, blush=True,
    arm_len=0.24, arm_r=0.09, arm_color="shirt_yellow", tail="none", accessories=accessories,
)

run(lambda: build_animal(SPEC), __file__)

"""Rocco, the raccoon who runs the bait-and-tackle shop (sells rod upgrades)."""
import os, sys; sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "_lib"))
from kit import *
from animals import *


def accessories(ctx):
    cap(ctx, "roof_teal", "#2A8C84")
    apron(ctx, "#5DA66A")


SPEC = dict(
    fur="#8E9098", light="#E4E2DC", paw="#3A3A40", head_color="#A2A4AC",
    hip=0.24, body_r=0.29, body_scale=(1.0, 0.92, 1.05),
    head_r=0.29, head_scale=(1.15, 1.0, 0.92), muzzle="small", nose_color="eye", ears="cat",
    mask="#34343A", eye_size=0.15, eye_spread=0.38, whiskers=True,
    arm_len=0.24, arm_r=0.07, leg_r=0.085, tail="cat", tail_tip="#34343A", tail_stripes="#34343A",
    accessories=accessories,
)

run(lambda: build_animal(SPEC), __file__)

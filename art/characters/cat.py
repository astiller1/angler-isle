"""Mika, the angler cat (player character). Orange tabby with a straw hat and a red neckerchief."""
import os, sys; sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "_lib"))
from kit import *
from animals import build_animal, hat_straw, neckerchief


def accessories(ctx):
    hat_straw(ctx)
    neckerchief(ctx, "red")


SPEC = dict(
    fur="cat_orange", light="cat_light", paw="cat_light", tail_tip="cat_light",
    hip=0.24, body_r=0.26, body_scale=(1.0, 0.9, 1.08),
    head_r=0.3, head_scale=(1.12, 1.0, 0.92),
    muzzle="small", nose_color="nose", ears="cat", whiskers=True, head_stripes="cat_stripe",
    eye_size=0.17, eye_spread=0.38,
    arm_len=0.22, arm_r=0.068, leg_r=0.085,
    tail="cat_side", accessories=accessories,
)


def build():
    build_animal(SPEC)


run(build, __file__)

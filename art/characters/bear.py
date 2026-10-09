"""Bruno, the bear cook at the beach shack (neighbor)."""
import os, sys; sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "_lib"))
from kit import *
from animals import *


def accessories(ctx):
    chef_hat(ctx)
    apron(ctx)


SPEC = dict(
    fur="bear", light="bear_light", paw="bear_light",
    hip=0.26, body_r=0.36, body_scale=(1.05, 0.95, 1.05),
    head_r=0.31, head_scale=(1.1, 1.0, 0.95), muzzle="snout", nose_color="eye", ears="round",
    eye_size=0.14, eye_spread=0.36, arm_len=0.28, arm_r=0.085, leg_r=0.1,
    tail="stub", accessories=accessories,
)

run(lambda: build_animal(SPEC), __file__)

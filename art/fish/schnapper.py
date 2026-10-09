"""Rotschnapper (red snapper) — uncommon, Hafen-Pier."""
import os, sys; sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "_lib"))
from kit import run
from fishkit import build_fish

SPEC = dict(height=0.38, width=0.16, top="#E2483F", bottom="#FFC2B0", fin="#F06A5C", tail="fork", dorsal="spiky", eye=1.3, tail_lift=0.02)

run(lambda: build_fish(SPEC, "schnapper"), __file__)

"""Gelbflossen-Thunfisch — rare, Offene See (needs the carbon rod). Torpedo body, navy back, yellow fins."""
import os, sys; sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "_lib"))
from kit import run
from fishkit import build_fish

SPEC = dict(height=0.3, width=0.2, taper=0.82, top="#1F3A6B", bottom="#E6ECF2", pattern="hstripes", pattern_color="#F2C230", pattern_n=1, fin="#F2C230", tail="lunate", tail_size=1.2, dorsal="spiky", eye=1.0, jaw="normal")

run(lambda: build_fish(SPEC, "thunfisch"), __file__)

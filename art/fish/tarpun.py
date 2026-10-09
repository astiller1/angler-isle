"""Silberkönig-Tarpun (tarpon) — rare, Mangroven. Big shiny silver."""
import os, sys; sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "_lib"))
from kit import run
from fishkit import build_fish

SPEC = dict(height=0.33, width=0.14, taper=0.72, top="#7E9DB8", bottom="#F4F8FC", fin="#9DB4C8", tail="fork", tail_size=1.1, dorsal="sail", eye=1.4, jaw="under")

run(lambda: build_fish(SPEC, "tarpun"), __file__)

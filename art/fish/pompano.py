"""Pompano (Florida pompano) — common, Brandungsstrand."""
import os, sys; sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "_lib"))
from kit import run
from fishkit import build_fish

SPEC = dict(height=0.48, width=0.12, taper=0.85, top="#B9C6CF", bottom="#F7E07A", fin="#F2CF55", tail="fork", tail_size=1.0, dorsal="small", flat_belly=False)

run(lambda: build_fish(SPEC, "pompano"), __file__)

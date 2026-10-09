"""Zackenbarsch (grouper) — rare, Felsküste. Chunky with spots."""
import os, sys; sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "_lib"))
from kit import run
from fishkit import build_fish

SPEC = dict(height=0.4, width=0.24, taper=0.6, top="#7A6A4F", bottom="#D9C7A0", pattern="spots", pattern_color="#4A3D2C", fin="#6A5A40", tail="round", dorsal="long", eye=0.8, jaw="under")

run(lambda: build_fish(SPEC, "zackenbarsch"), __file__)

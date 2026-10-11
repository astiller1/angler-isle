"""Goldmakrele (mahi-mahi) — uncommon, Offene See. Tall blunt head, golden-green with blue spots, long dorsal fin."""
import os, sys; sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "_lib"))
from kit import run
from fishkit import build_fish

SPEC = dict(height=0.36, width=0.13, taper=0.8, top="#2E9E6A", bottom="#F7D64A", pattern="spots", pattern_color="#3D7FD0", fin="#3D9FD0", tail="fork", tail_size=1.15, dorsal="long", eye=1.0, jaw="normal")

run(lambda: build_fish(SPEC, "goldmakrele"), __file__)

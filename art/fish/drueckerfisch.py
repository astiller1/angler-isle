"""Drückerfisch (queen triggerfish) — common, Felsküste."""
import os, sys; sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "_lib"))
from kit import run
from fishkit import build_fish

SPEC = dict(height=0.55, width=0.14, taper=0.85, top="#5BB3D9", bottom="#F6E27A", pattern="vstripes", pattern_color="#2F6FB0", pattern_n=2, fin="#4A9CD0", tail="lunate", dorsal="sail", eye=0.9, jaw="lips", lip_color="#2F6FB0")

run(lambda: build_fish(SPEC, "drueckerfisch"), __file__)

"""Barrakuda — uncommon, Riffkante / Offene See. Long and slim, silver with dark bars and an underbite."""
import os, sys; sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "_lib"))
from kit import run
from fishkit import build_fish

SPEC = dict(height=0.17, width=0.1, taper=0.55, top="#6F8296", bottom="#EEF2F5", pattern="bars", pattern_color="#3E4C5C", pattern_n=7, fin="#5A6B7C", tail="fork", dorsal="small", eye=1.2, jaw="under")

run(lambda: build_fish(SPEC, "barrakuda"), __file__)

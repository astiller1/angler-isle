"""Grätenfisch (bonefish) — uncommon, Brandungsstrand. Silver with faint bars."""
import os, sys; sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "_lib"))
from kit import run
from fishkit import build_fish

SPEC = dict(height=0.27, width=0.14, taper=0.7, top="#A9B8C2", bottom="#F7FAFC", pattern="bars", pattern_color="#8296A4", pattern_n=5, fin="#C6D2DA", tail="fork", dorsal="small", jaw="normal")

run(lambda: build_fish(SPEC, "bonefisch"), __file__)

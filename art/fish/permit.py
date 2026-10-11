"""Permit — rare, Sandbank. Deep silver body, dark sickle fins, very shy."""
import os, sys; sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "_lib"))
from kit import run
from fishkit import build_fish

SPEC = dict(height=0.5, width=0.14, taper=0.72, top="#8FA3B0", bottom="#F2F5F7", fin="#3B444C", tail="lunate", tail_size=1.15, dorsal="small", eye=1.3, jaw="normal")

run(lambda: build_fish(SPEC, "permit"), __file__)

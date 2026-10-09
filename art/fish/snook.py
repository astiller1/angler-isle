"""Snook (common snook) — common, Mangroven. Sleek with a black lateral line."""
import os, sys; sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "_lib"))
from kit import run
from fishkit import build_fish

SPEC = dict(height=0.27, width=0.13, taper=0.7, top="#8F9A7A", bottom="#F2F0E4", pattern="hstripes", pattern_color="#2A2A2A", pattern_n=1, fin="#C8C47A", tail="fork", dorsal="small", jaw="under")

run(lambda: build_fish(SPEC, "snook"), __file__)

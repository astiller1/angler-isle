"""Blaustreifen-Grunzer (bluestriped grunt) — common, Hafen-Pier."""
import os, sys; sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "_lib"))
from kit import run
from fishkit import build_fish

SPEC = dict(height=0.36, width=0.15, top="#F2C744", bottom="#FFF1B5", pattern="hstripes", pattern_color="#3E7FD6", pattern_n=4, fin="#E8B53A", tail="fork", dorsal="spiky", jaw="lips", lip_color="#F28C5A")

run(lambda: build_fish(SPEC, "grunzer"), __file__)

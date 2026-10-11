"""Papageifisch (parrotfish) — common, Riffkante. Round, turquoise-green with pink scale spots and lips."""
import os, sys; sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "_lib"))
from kit import run
from fishkit import build_fish

SPEC = dict(height=0.4, width=0.17, taper=0.62, top="#2FB59A", bottom="#9FE6C8", pattern="spots", pattern_color="#F27FB0", fin="#F27FB0", tail="round", dorsal="long", eye=1.1, jaw="lips")

run(lambda: build_fish(SPEC, "papageifisch"), __file__)

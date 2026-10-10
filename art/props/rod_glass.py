"""Tier 2 — Glasfaserrute: longer, white-blue with a chrome reel."""
import os, sys; sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "_lib"))
from kit import run
from rods import make_rod

run(lambda: make_rod("rod_glass", length=1.95, shaft="#F2F6FA", shaft_tip="#3F8FE0", grip="#2C5E9E", reel="#D8DEE4",
                     accent="#3F8FE0", reel_size=0.08), __file__)

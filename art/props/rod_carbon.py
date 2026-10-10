"""Tier 3 — Karbon-Profirute: longest, black carbon with gold wraps and a big reel."""
import os, sys; sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "_lib"))
from kit import run
from rods import make_rod

run(lambda: make_rod("rod_carbon", length=2.2, shaft="#2A2A30", shaft_tip="#E2483F", grip="#1A1A1E", reel="#F2C14E",
                     accent="#E2483F", rings="#F2C14E", bands="#F2C14E", reel_size=0.095), __file__)

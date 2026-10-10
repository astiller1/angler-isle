"""Tier 1 — Bambusrute (starter rod). Grip at the origin, rod points up (+Z). ANCHOR_tip = line exit."""
import os, sys; sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "_lib"))
from kit import run
from rods import make_rod

run(lambda: make_rod("rod", length=1.7, shaft="#C9A45E", grip="#8A6A44", reel="reel", accent="red", bands="#9C7A40"), __file__)

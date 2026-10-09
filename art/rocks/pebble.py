"""Small pebble cluster decoration (instanced, no collision)."""
import os, sys; sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "_lib"))
from kit import run
from nature import *

run(lambda: rock(seed=5, size=0.3, flat=0.7, color="rock_light", name="pebble", collide=False), __file__)

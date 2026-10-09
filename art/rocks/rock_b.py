"""Flat coastal rock — good for standing on (instanced)."""
import os, sys; sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "_lib"))
from kit import run
from nature import *

run(lambda: rock(seed=7, size=1.6, flat=0.55, color="rock_light", name="rock_b"), __file__)

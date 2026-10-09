"""Big boulder for cliffs (instanced)."""
import os, sys; sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "_lib"))
from kit import run
from nature import *

run(lambda: rock(seed=11, size=2.6, flat=0.9, name="rock_c"), __file__)

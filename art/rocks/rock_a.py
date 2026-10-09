"""Medium rounded rock (instanced)."""
import os, sys; sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "_lib"))
from kit import run
from nature import *

run(lambda: rock(seed=3, size=1.0, name="rock_a"), __file__)

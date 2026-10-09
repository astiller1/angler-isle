"""Young short palm (instanced)."""
import os, sys; sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "_lib"))
from kit import run
from nature import *

run(lambda: palm(seed=12, height=3.4, lean=0.5, leaves=7, coconuts=0, name="palm_c"), __file__)

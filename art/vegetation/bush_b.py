"""Plain green bush (instanced)."""
import os, sys; sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "_lib"))
from kit import run
from nature import *

run(lambda: bush(seed=9, size=1.3, flowers=False, name="bush_b"), __file__)

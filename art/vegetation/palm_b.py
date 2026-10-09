"""Strongly leaning beach palm (instanced)."""
import os, sys; sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "_lib"))
from kit import run
from nature import *

run(lambda: palm(seed=8, height=5.0, lean=2.0, leaves=7, name="palm_b"), __file__)

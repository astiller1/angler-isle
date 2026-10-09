"""Flowering bush (instanced)."""
import os, sys; sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "_lib"))
from kit import run
from nature import *

run(lambda: bush(seed=4, size=1.0, name="bush_a"), __file__)

"""Grass tuft (instanced, no collision)."""
import os, sys; sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "_lib"))
from kit import run
from nature import *

run(lambda: grass(seed=2, name="grass"), __file__)

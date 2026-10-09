"""Mangrove tree with arching roots, stands in shallow water (instanced)."""
import os, sys; sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "_lib"))
from kit import run
from nature import *

run(lambda: mangrove(seed=6, name="mangrove"), __file__)

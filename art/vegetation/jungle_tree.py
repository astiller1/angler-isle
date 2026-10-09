"""Broad-leaf jungle tree for the hill (instanced)."""
import os, sys; sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "_lib"))
from kit import run
from nature import *

run(lambda: jungle_tree(seed=5, name="jungle_tree"), __file__)

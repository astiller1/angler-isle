"""Small flower patch (instanced, no collision)."""
import os, sys; sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "_lib"))
from kit import run
from nature import *

run(lambda: flowers(seed=2, name="flowers"), __file__)

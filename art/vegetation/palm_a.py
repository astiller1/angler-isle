"""Tall, gently leaning palm (instanced)."""
import os, sys; sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "_lib"))
from kit import run
from nature import *

run(lambda: palm(seed=3, height=6.2, lean=0.9, name="palm_a"), __file__)

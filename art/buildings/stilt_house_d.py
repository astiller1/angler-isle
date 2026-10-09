"""Mint stilt house with front porch. Origin = ground level at the house center; front (-Y) has the stairs."""
import os, sys; sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "_lib"))
from kit import *
from houses import stilt_house

run(lambda: stilt_house(4, "wall_mint", "roof_red", two_story=False).finish("stilt_house_d"), __file__)

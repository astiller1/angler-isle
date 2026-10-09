"""Two-story blue stilt house with a roof terrace (stairs on the right side). Origin = ground level at the house center; front (-Y) has the stairs."""
import os, sys; sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "_lib"))
from kit import *
from houses import stilt_house

run(lambda: stilt_house(1, "wall_blue", "roof_red", two_story=True).finish("stilt_house_a"), __file__)

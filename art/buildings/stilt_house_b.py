"""Pink stilt house with front porch. Origin = ground level at the house center; front (-Y) has the stairs."""
import os, sys; sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "_lib"))
from kit import *
from houses import stilt_house

run(lambda: stilt_house(2, "wall_pink", "roof_teal", two_story=False).finish("stilt_house_b"), __file__)

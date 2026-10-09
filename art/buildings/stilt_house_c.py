"""Yellow stilt house with front porch. Origin = ground level at the house center; front (-Y) has the stairs."""
import os, sys; sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "_lib"))
from kit import *
from houses import stilt_house

run(lambda: stilt_house(3, "wall_yellow", "roof_blue", two_story=False).finish("stilt_house_c"), __file__)

"""The shared colour palette (sRGB hex). Keep colours here so the whole island stays harmonious."""

C = {
    # ground
    "sand": "#F4E1A6", "sand_wet": "#E2C98C", "sand_path": "#E8C98A", "seabed": "#E9D9A4", "seabed_deep": "#9FC7B3",
    "grass": "#86C96A", "grass_light": "#A6D877", "grass_dark": "#5DAA5A", "jungle": "#3F9452", "jungle_dark": "#2F7A45",
    "rock": "#A39C92", "rock_light": "#BDB6AB", "rock_dark": "#7D766E", "mud": "#8C7A55",
    # wood
    "wood": "#B9834F", "wood_dark": "#80542F", "wood_light": "#D9AA70", "plank": "#C9935C", "plank_dark": "#A8754A",
    "driftwood": "#CDB9A0", "rope": "#D8C08E",
    # buildings
    "roof_red": "#E86A5C", "roof_teal": "#3DB5AC", "roof_yellow": "#F5C451", "roof_blue": "#4F8FD6",
    "wall_pink": "#F7AFC0", "wall_blue": "#93CDF2", "wall_mint": "#A9E5C8", "wall_yellow": "#FDE68E",
    "wall_white": "#FBF6EA", "trim": "#FFFFFF", "window": "#5A86A8", "door": "#8A5A3A",
    # nature
    "palm_leaf": "#5FC064", "palm_leaf_dark": "#3F9A4B", "trunk": "#A88158", "trunk_dark": "#86643F",
    "coconut": "#6B4A2B", "flower_red": "#F2545B", "flower_yellow": "#FFD34E", "flower_pink": "#FF8FB8",
    "mangrove_root": "#7A5C40", "mangrove_leaf": "#4E9C4E",
    # characters
    "cat_orange": "#F3A24B", "cat_stripe": "#D97C2B", "cat_light": "#FFE3B8", "pink": "#F59AB2", "nose": "#E86F8A",
    "walrus": "#B98C6E", "walrus_light": "#D9B597", "tusk": "#FFF6E0",
    "bear": "#9C6B45", "bear_light": "#D8B08A",
    "sloth": "#A89279", "sloth_light": "#DCCDB5", "sloth_mask": "#5E4A3A",
    "pelican": "#F7F5F0", "pelican_grey": "#C9CCD3", "beak": "#F6B94A", "beak_pouch": "#F29A52",
    "eye": "#1E1E24", "eye_shine": "#FFFFFF", "blush": "#FF9FB0",
    "hat_green": "#5DA66A", "hat_band": "#F2D15C", "chef_white": "#FFFFFF", "cap_blue": "#3E6FB0",
    "shirt_red": "#E45B5B", "shirt_blue": "#5B8DE4", "shirt_yellow": "#F4C84A", "apron": "#FFFFFF",
    # props
    "cooler_body": "#3FA7E0", "cooler_lid": "#FFFFFF", "cooler_handle": "#2C6E99",
    "rod": "#5A3B22", "rod_grip": "#2D2D2D", "reel": "#C0C6CC", "bobber_red": "#F2453D", "bobber_white": "#FFFFFF",
    "metal": "#B8BEC4", "black": "#2A2A2E", "white": "#FFFFFF", "red": "#E5484D", "yellow": "#FFD24A",
    "sign": "#F1D9A8", "awning_a": "#FF7B6B", "awning_b": "#FFFFFF", "crate": "#C08A55", "net": "#E7DCC2",
    "col": "#FF00FF",
}


def hex_rgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) / 255.0 for i in (0, 2, 4))


def _to_lin(c):
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def lin(color):
    """Palette key, '#hex' or (r,g,b) sRGB floats -> linear RGB tuple."""
    if isinstance(color, str):
        rgb = hex_rgb(C.get(color, color))
    else:
        rgb = color
    return tuple(_to_lin(c) for c in rgb)


def mix(a, b, t):
    """Mix two colours in sRGB space, returns an (r,g,b) tuple usable anywhere a colour is."""
    ra = hex_rgb(C.get(a, a)) if isinstance(a, str) else a
    rb = hex_rgb(C.get(b, b)) if isinstance(b, str) else b
    t = max(0.0, min(1.0, t))
    return tuple(x + (y - x) * t for x, y in zip(ra, rb))

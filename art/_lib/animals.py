"""Cartoon animal kit: chibi proportions, rigid named parts with pivots at the joints.

Part hierarchy (names are read by src/player/PartAnimator.ts):
    root (empty at the feet)
      leg_L, leg_R            pivot at hips
      body                    pivot at hips
        head                  pivot at neck
        arm_L, arm_R          pivot at shoulders  (arm_R has ANCHOR_hand_R)
        tail                  pivot at tail base
        ANCHOR_back           where the cooler is strapped
Front = -Y. Left = +X (character's own left when facing -Y).
"""
from kit import MB, obj_from, empty, Vector, math
from palette import mix


def _eye(mb, x, y, z, r, sleepy=False, color="eye"):
    if sleepy:
        # closed eye: a small dark arc (flattened capsule)
        mb.sphere(r, (x, y, z), scale=(1.15, 0.35, 0.25), color=color, seg=10, rings=6)
        return
    mb.sphere(r, (x, y, z), scale=(0.85, 0.5, 1.15), color=color, seg=10, rings=8)
    mb.sphere(r * 0.32, (x + r * 0.25 * (1 if x > 0 else -1) * -1, y - r * 0.38, z + r * 0.4), color="eye_shine", seg=6, rings=4)


def build_animal(spec):
    """spec: dict — see cat.py for a fully commented example."""
    s = spec
    H = s.get("hip", 0.25)               # hip height
    body_r = s.get("body_r", 0.27)
    body_scale = s.get("body_scale", (1.0, 0.9, 1.05))
    body_z = H + body_r * body_scale[2] * 0.62
    neck_z = body_z + body_r * body_scale[2] * 0.72
    head_r = s.get("head_r", 0.3)
    head_scale = s.get("head_scale", (1.1, 1.0, 0.92))
    head_z = neck_z + head_r * head_scale[2] * 0.8
    fur, light = s["fur"], s.get("light", s["fur"])

    root = empty("root", (0, 0, 0), size=0.2)

    # ---- legs
    leg_len = s.get("leg_len", H)
    for side, name in ((1, "leg_L"), (-1, "leg_R")):
        mb = MB()
        x = side * s.get("leg_x", body_r * 0.45)
        r = s.get("leg_r", 0.085)
        if leg_len > 0.02:
            mb.tube([(x, 0, H), (x, 0, max(H - leg_len + r, r))], r, color=fur, seg=8)
        mb.sphere(r * 1.25, (x, -r * 0.6, r * 0.9), scale=(1, 1.35, 0.75), color=s.get("paw", light), seg=10, rings=6)
        obj_from(mb, name, origin=(x, 0, H), parent_obj=root)

    # ---- body
    mb = MB()
    pattern = s.get("body_color", fur)
    mb.sphere(body_r, (0, 0, body_z), scale=body_scale, color=pattern, seg=16, rings=10)
    if s.get("belly", True):
        mb.sphere(body_r * 0.72, (0, -body_r * 0.38, body_z - body_r * 0.08), scale=(0.95, 0.6, 1.0), color=light, seg=12, rings=8)
    body = obj_from(mb, "body", origin=(0, 0, H), parent_obj=root)
    empty("ANCHOR_back", (0, body_r * body_scale[1] * 0.95, body_z + 0.02), parent_obj=body)

    # ---- head
    mb = MB()
    hz = head_z
    mb.sphere(head_r, (0, 0, hz), scale=head_scale, color=s.get("head_color", fur), seg=16, rings=12)
    fy = -head_r * head_scale[1]  # front surface y
    muzzle = s.get("muzzle", "small")
    if muzzle == "small":
        mb.sphere(head_r * 0.42, (0, fy * 0.82, hz - head_r * 0.28), scale=(1.25, 0.75, 0.8), color=light, seg=12, rings=8)
        nose_pos = (0, fy * 1.05, hz - head_r * 0.14)
    elif muzzle == "snout":
        mb.sphere(head_r * 0.45, (0, fy * 0.95, hz - head_r * 0.22), scale=(1.05, 0.95, 0.8), color=light, seg=12, rings=8)
        nose_pos = (0, fy * 1.3, hz - head_r * 0.1)
    elif muzzle == "walrus":
        for sx in (-1, 1):
            mb.sphere(head_r * 0.36, (sx * head_r * 0.27, fy * 0.85, hz - head_r * 0.3), scale=(1, 0.8, 0.85), color=light, seg=12, rings=8)
        nose_pos = (0, fy * 1.0, hz - head_r * 0.08)
        for sx in (-1, 1):
            mb.cyl(0.03, head_r * 0.75, (sx * head_r * 0.22, fy * 0.85, hz - head_r * 0.8), r2=0.012, color="tusk", seg=6)
    else:
        nose_pos = None
    if nose_pos and s.get("nose", True):
        mb.sphere(head_r * 0.11, nose_pos, scale=(1.3, 0.8, 0.9), color=s.get("nose_color", "nose"), seg=8, rings=6)
    ex = head_r * s.get("eye_spread", 0.38)
    ez = hz + head_r * s.get("eye_z", 0.08)
    _eye(mb, ex, fy * 0.86, ez, head_r * s.get("eye_size", 0.17), sleepy=s.get("sleepy", False))
    _eye(mb, -ex, fy * 0.86, ez, head_r * s.get("eye_size", 0.17), sleepy=s.get("sleepy", False))
    if s.get("blush", True):
        for sx in (-1, 1):
            mb.sphere(head_r * 0.12, (sx * head_r * 0.62, fy * 0.7, hz - head_r * 0.2), scale=(1.2, 0.3, 0.7), color="blush", seg=8, rings=4)
    if s.get("mask"):
        for sx in (-1, 1):
            mb.sphere(head_r * 0.24, (sx * ex, fy * 0.8, ez - head_r * 0.04), scale=(1.4, 0.4, 0.8), rot=(0, sx * 0.35, 0), color=s["mask"], seg=10, rings=6)
        # redraw eyes above the mask
        _eye(mb, ex, fy * 0.93, ez, head_r * s.get("eye_size", 0.17), sleepy=s.get("sleepy", False))
        _eye(mb, -ex, fy * 0.93, ez, head_r * s.get("eye_size", 0.17), sleepy=s.get("sleepy", False))
    ears = s.get("ears", "cat")
    for sx in (-1, 1):
        if ears == "cat":
            base = (sx * head_r * 0.6, head_r * 0.05, hz + head_r * 0.7)
            mb.cyl(head_r * 0.33, head_r * 0.8, base, rot=(0.15, sx * 0.42, 0), r2=0.01, color=fur, seg=4)
            inner = (base[0] * 0.98, base[1] - head_r * 0.1, base[2] - head_r * 0.02)
            mb.cyl(head_r * 0.2, head_r * 0.55, inner, rot=(0.15, sx * 0.42, 0), r2=0.01, color="pink", seg=4)
        elif ears == "round":
            pos = (sx * head_r * 0.68, head_r * 0.05, hz + head_r * 0.62)
            mb.sphere(head_r * 0.27, pos, scale=(1, 0.55, 1), color=fur, seg=10, rings=6)
            mb.sphere(head_r * 0.16, (pos[0], pos[1] - head_r * 0.1, pos[2]), scale=(1, 0.4, 1), color=light, seg=8, rings=6)
    if s.get("whiskers"):
        for sx in (-1, 1):
            for k, tilt in enumerate((-0.18, 0.12)):
                mb.box((head_r * 0.6, 0.008, 0.008), (sx * head_r * 0.62, fy * 0.88, hz - head_r * (0.22 + 0.08 * k)), rot=(0, tilt * sx, 0), color=s.get("whisker_color", "white"))
    stripes = s.get("head_stripes")
    if stripes:
        for k in (-1, 0, 1):
            mb.box((head_r * 0.08, head_r * 0.5, head_r * 0.06), (k * head_r * 0.22, -head_r * 0.15, hz + head_r * 0.86 - abs(k) * head_r * 0.05), rot=(0.5, 0, k * 0.2), color=stripes)
    head = obj_from(mb, "head", origin=(0, 0, neck_z), parent_obj=body)

    # ---- arms
    arm_len = s.get("arm_len", 0.24)
    arm_r = s.get("arm_r", 0.07)
    shoulder_z = body_z + body_r * 0.35
    for side, name in ((1, "arm_L"), (-1, "arm_R")):
        mb = MB()
        sx = side * body_r * body_scale[0] * 0.88
        end = (sx + side * arm_len * 0.25, -0.02, shoulder_z - arm_len)
        mb.tube([(sx, 0, shoulder_z), end], [arm_r, arm_r * 0.9], color=s.get("arm_color", fur), seg=8)
        mb.sphere(arm_r * 1.2, end, color=s.get("paw", light), seg=10, rings=6)
        arm = obj_from(mb, name, origin=(sx, 0, shoulder_z), parent_obj=body)
        if side == -1:
            empty("ANCHOR_hand_R", (end[0], end[1] - 0.02, end[2]), parent_obj=arm)

    # ---- tail
    tail = s.get("tail", "cat")
    if tail != "none":
        mb = MB()
        by = body_r * body_scale[1] * 0.85
        tz = H + 0.08
        if tail == "cat":
            pts = [(0, by, tz), (0, by + 0.14, tz + 0.04), (0, by + 0.24, tz + 0.18), (0, by + 0.24, tz + 0.36), (0, by + 0.18, tz + 0.46)]
            stripes = s.get("tail_stripes")
            tail_col = (lambda co: stripes if int((co.z - tz) * 14) % 2 == 0 else fur) if stripes else fur
            mb.tube(pts, [0.06, 0.058, 0.055, 0.05, 0.045], color=tail_col, seg=8)
            mb.sphere(0.05, pts[-1], color=s.get("tail_tip", fur), seg=8, rings=6)
        elif tail == "stub":
            mb.sphere(0.07, (0, by + 0.02, tz + 0.04), color=fur, seg=8, rings=6)
        obj_from(mb, "tail", origin=(0, by, tz), parent_obj=body)

    if "accessories" in s:
        s["accessories"](dict(root=root, body=body, head=head, head_z=hz, head_r=head_r, head_scale=head_scale,
                              neck_z=neck_z, body_z=body_z, body_r=body_r, body_scale=body_scale, fy=fy))
    return root


def add_to(part, name, mb, origin):
    """Bake an accessory mesh as a child object of a part (e.g. a hat on the head)."""
    return obj_from(mb, name, origin=origin, parent_obj=part)


def hat_straw(ctx, color="#F2D38B", band="red"):
    mb = MB()
    top = ctx["head_z"] + ctx["head_r"] * ctx["head_scale"][2] * 0.82
    mb.cyl(ctx["head_r"] * 1.12, 0.03, (0, 0.06, top), rot=(0.22, 0, 0), color=color, seg=16)
    mb.cyl(ctx["head_r"] * 0.5, ctx["head_r"] * 0.45, (0, 0.1, top + ctx["head_r"] * 0.2), rot=(0.22, 0, 0), r2=ctx["head_r"] * 0.44, color=color, seg=14)
    mb.cyl(ctx["head_r"] * 0.52, ctx["head_r"] * 0.13, (0, 0.075, top + ctx["head_r"] * 0.07), rot=(0.22, 0, 0), color=band, seg=14)
    return add_to(ctx["head"], "hat", mb, (0, 0, top))


def cap(ctx, color="cap_blue", bill="cap_blue"):
    mb = MB()
    top = ctx["head_z"] + ctx["head_r"] * ctx["head_scale"][2] * 0.55
    mb.sphere(ctx["head_r"] * 0.92, (0, 0.02, top), scale=(1.12, 1.05, 0.62), color=color, seg=14, rings=8)
    mb.box((ctx["head_r"] * 1.1, ctx["head_r"] * 0.7, 0.03), (0, -ctx["head_r"] * 1.05, top - 0.02), rot=(-0.15, 0, 0), color=bill)
    return add_to(ctx["head"], "hat", mb, (0, 0, top))


def chef_hat(ctx):
    mb = MB()
    top = ctx["head_z"] + ctx["head_r"] * ctx["head_scale"][2] * 0.78
    mb.cyl(ctx["head_r"] * 0.62, ctx["head_r"] * 0.45, (0, 0, top + ctx["head_r"] * 0.2), color="chef_white", seg=14)
    for a in range(5):
        ang = a / 5 * math.tau
        mb.sphere(ctx["head_r"] * 0.32, (math.cos(ang) * ctx["head_r"] * 0.35, math.sin(ang) * ctx["head_r"] * 0.35, top + ctx["head_r"] * 0.62), color="chef_white", seg=10, rings=6)
    mb.sphere(ctx["head_r"] * 0.4, (0, 0, top + ctx["head_r"] * 0.75), color="chef_white", seg=10, rings=6)
    return add_to(ctx["head"], "hat", mb, (0, 0, top))


def neckerchief(ctx, color="red"):
    mb = MB()
    z = ctx["neck_z"] - 0.01
    mb.cyl(ctx["body_r"] * 0.78, 0.07, (0, 0, z), color=color, seg=14)
    mb.cyl(0.07, 0.12, (0, -ctx["body_r"] * 0.72, z - 0.06), rot=(math.pi, 0, 0), r2=0.005, color=color, seg=3)
    return add_to(ctx["body"], "scarf", mb, (0, 0, z))


def apron(ctx, color="apron"):
    mb = MB()
    bz = ctx["body_z"]
    r = ctx["body_r"]
    sy = ctx["body_scale"][1]
    mb.sphere(r * 0.85, (0, -r * sy * 0.62, bz - r * 0.18), scale=(ctx["body_scale"][0] * 0.95, 0.42, ctx["body_scale"][2] * 0.95), color=color, seg=14, rings=10)
    mb.box((r * 1.9, 0.02, 0.025), (0, -r * sy * 0.05, bz + r * 0.25), color=color)
    return add_to(ctx["body"], "apron", mb, (0, 0, bz))

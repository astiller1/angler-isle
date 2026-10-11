import * as THREE from 'three';
import { lookOrientation, toTangent, upAt, worldToMap } from '../planet/Planet';
import type { Collision } from '../world/Collision';
import type { Seabed } from '../world/Seabed';

export const PLAYER_SETTINGS = {
  radius: 0.32,
  height: 1.05,
  walkSpeed: 4.4,
  sprintSpeed: 6.8,
  gravity: 24,
  jumpSpeed: 7.2,
  turnRate: 12,
  /** Deepest seabed the player may wade/float over. */
  maxWadeDepth: 1.4,
  /** Floating level in water (feet height). */
  floatLevel: -0.55,
  /** Surfaces whose normal·up exceeds this are walkable ground (0.25 ≈ 75°): no sliding, no blocking. */
  walkable: 0.25,
  /** How far below the feet the ground may drop while walking before the cat leaves the ground. */
  snapDistance: 0.6,
};

export interface MoveIntent {
  /** Wish direction in world space (tangent), length 0..1. */
  dir: THREE.Vector3;
  sprint: boolean;
  jump: boolean;
}

/**
 * Movement mode interface — `OnFoot` now; `InBoat` (Milestone 3) will implement the same contract
 * so the rest of the game only talks to PlayerController.
 */
export interface MovementMode {
  readonly id: string;
  update(p: PlayerController, intent: MoveIntent, dt: number): void;
}

/** The player's body: position on the planet, velocity, facing, collision. */
export class PlayerController {
  readonly position = new THREE.Vector3();
  readonly velocity = new THREE.Vector3();
  /** Tangent facing direction (where the cat looks). */
  readonly facing = new THREE.Vector3(0, 0, 1);
  readonly up = new THREE.Vector3(0, 1, 0);
  readonly quaternion = new THREE.Quaternion();
  grounded = false;
  inWater = false;
  /** Horizontal speed (m/s) for animation. */
  speed = 0;
  mode: MovementMode;
  /** Freeze movement (menus, fishing). */
  locked = false;

  constructor(
    readonly collision: Collision,
    readonly seabed: Seabed,
  ) {
    this.mode = new OnFoot();
  }

  teleport(p: THREE.Vector3, facing?: THREE.Vector3): void {
    this.position.copy(p);
    this.velocity.set(0, 0, 0);
    upAt(p, this.up);
    if (facing) this.facing.copy(facing);
    toTangent(this.facing, this.up);
    lookOrientation(this.up, this.facing, this.quaternion);
  }

  update(intent: MoveIntent, dt: number): void {
    if (this.locked) {
      intent = { dir: intent.dir.set(0, 0, 0), sprint: false, jump: false };
    }
    this.mode.update(this, intent, dt);
    upAt(this.position, this.up);
    toTangent(this.facing, this.up);
    lookOrientation(this.up, this.facing, this.quaternion);
  }

  /** Turn smoothly toward a tangent direction. */
  faceToward(dir: THREE.Vector3, dt: number, rate = PLAYER_SETTINGS.turnRate): void {
    if (dir.lengthSq() < 1e-6) return;
    const target = _tmp.copy(dir).normalize();
    this.facing.lerp(target, 1 - Math.exp(-rate * dt));
    toTangent(this.facing, this.up);
  }
}

const _tmp = new THREE.Vector3();
const _seg = new THREE.Line3();
const _box = new THREE.Box3();
const _triPoint = new THREE.Vector3();
const _capPoint = new THREE.Vector3();
const _hor = new THREE.Vector3();
const _target = new THREE.Vector3();
const _before = new THREE.Vector3();
const _delta = new THREE.Vector3();
const _grad = new THREE.Vector2();
const _gradW = new THREE.Vector3();
const _map = { x: 0, z: 0, h: 0 };

/** Walking with radial gravity, capsule-vs-BVH collision, wading, and a soft deep-water boundary. */
export class OnFoot implements MovementMode {
  readonly id = 'onFoot';

  update(p: PlayerController, intent: MoveIntent, dt: number): void {
    const S = PLAYER_SETTINGS;
    const up = upAt(p.position, p.up);
    worldToMap(p.position, _map);
    const feetH = _map.h;
    p.inWater = feetH < -0.15;

    let vUp = p.velocity.dot(up);
    _hor.copy(p.velocity).addScaledVector(up, -vUp);

    const speed = (intent.sprint ? S.sprintSpeed : S.walkSpeed) * (p.inWater ? 0.6 : 1);
    _target.copy(intent.dir).multiplyScalar(speed);
    _hor.lerp(_target, 1 - Math.exp(-dt * (p.grounded || p.inWater ? 14 : 2.5)));

    // soft boundary: do not let the player wade into deep water
    const bed = p.seabed.height(_map.x, _map.z);
    if (feetH < 0.5 && bed < -S.maxWadeDepth) {
      p.seabed.gradient(_map.x, _map.z, _grad);
      if (_grad.lengthSq() > 1e-6) {
        _grad.normalize();
        // world-space uphill (map x ≈ east, map z ≈ south near the island)
        _gradW.set(_grad.x, 0, _grad.y);
        toTangent(_gradW, up);
        const into = _hor.dot(_gradW);
        if (into < 0) _hor.addScaledVector(_gradW, -into);
        _hor.addScaledVector(_gradW, 3.0 * Math.min(1, (-S.maxWadeDepth - bed) * 0.8 + 0.4));
      }
    }

    const wasGrounded = p.grounded;
    let jumped = false;
    vUp = p.grounded ? Math.min(vUp, 0) - S.gravity * dt : vUp - S.gravity * dt;
    if (intent.jump && (p.grounded || p.inWater)) {
      vUp = S.jumpSpeed;
      p.grounded = false;
      jumped = true;
    }
    p.velocity.copy(_hor).addScaledVector(up, vUp);
    p.speed = _hor.length();
    if (intent.dir.lengthSq() > 0.01) p.faceToward(intent.dir, dt);

    // integrate in sub-steps with capsule collision
    const steps = 4;
    const h = dt / steps;
    let grounded = false;
    for (let s = 0; s < steps; s++) {
      p.position.addScaledVector(p.velocity, h);
      if (collide(p)) grounded = true;
    }
    if (!grounded && wasGrounded && !jumped && p.velocity.dot(up) <= 0.5 && !p.inWater) grounded = snapToGround(p);
    p.grounded = grounded;

    // float on the surface instead of sinking
    worldToMap(p.position, _map);
    if (_map.h < S.floatLevel) {
      const u = upAt(p.position, _tmp);
      p.position.addScaledVector(u, S.floatLevel - _map.h);
      const vu = p.velocity.dot(u);
      if (vu < 0) p.velocity.addScaledVector(u, -vu);
    }
  }
}

const _down = new THREE.Vector3();

/**
 * Capsule vs. BVH. Walkable surfaces push the capsule straight up (along the local up), so standing or
 * walking on a slope never slides sideways. Steeper surfaces (walls) push out along their normal.
 * Returns true when the capsule rests on walkable ground.
 */
function collide(p: PlayerController): boolean {
  const bvh = p.collision.bvh;
  if (!bvh) return false;
  const S = PLAYER_SETTINGS;
  const up = upAt(p.position, _tmp.set(0, 0, 0));
  _before.copy(p.position);
  _seg.start.copy(p.position).addScaledVector(up, S.radius);
  _seg.end.copy(p.position).addScaledVector(up, S.height - S.radius);
  _box.makeEmpty();
  _box.expandByPoint(_seg.start);
  _box.expandByPoint(_seg.end);
  _box.min.addScalar(-S.radius - 0.05);
  _box.max.addScalar(S.radius + 0.05);
  let onGround = false;

  bvh.shapecast({
    intersectsBounds: (box) => box.intersectsBox(_box),
    intersectsTriangle: (tri) => {
      const dist = tri.closestPointToSegment(_seg, _triPoint, _capPoint);
      if (dist >= S.radius) return;
      const depth = S.radius - dist;
      const dir = _capPoint.sub(_triPoint).normalize();
      const nUp = dir.dot(up);
      if (nUp > S.walkable) {
        // ground: lift straight up just enough to clear the surface
        const lift = Math.min(depth / nUp, S.radius);
        _seg.start.addScaledVector(up, lift);
        _seg.end.addScaledVector(up, lift);
        onGround = true;
      } else {
        // wall or ceiling: push out horizontally / along the normal
        _seg.start.addScaledVector(dir, depth);
        _seg.end.addScaledVector(dir, depth);
        const into = p.velocity.dot(dir);
        if (into < 0) p.velocity.addScaledVector(dir, -into);
      }
    },
  });

  p.position.copy(_seg.start).addScaledVector(up, -S.radius);
  if (onGround) {
    const vUp = p.velocity.dot(up);
    if (vUp < 0) p.velocity.addScaledVector(up, -vUp);
  }
  void _delta;
  return onGround;
}

/** Keep the feet on the ground when walking down slopes or steps (instead of hopping). */
function snapToGround(p: PlayerController): boolean {
  const S = PLAYER_SETTINGS;
  const up = upAt(p.position, _tmp.set(0, 0, 0));
  _down.copy(up).negate();
  _before.copy(p.position).addScaledVector(up, 0.3);
  const hit = p.collision.raycast(_before, _down, 0.3 + S.snapDistance);
  if (!hit) return false;
  p.position.copy(hit.point);
  const vUp = p.velocity.dot(up);
  if (vUp < 0) p.velocity.addScaledVector(up, -vUp);
  // rest the capsule on the slope the same way collide() does (its sphere touches the slope a bit above
  // the point straight below) — otherwise the height alternates between snap and lift every frame (jitter)
  collide(p);
  return true;
}

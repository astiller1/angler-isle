import * as THREE from 'three';
import type { Assets } from '../core/Assets';
import { BOAT_SETTINGS } from '../data/boat';
import { mapToWorld, orientationAt, toTangent, upAt } from '../planet/Planet';
import { Water } from '../planet/Water';
import type { MoveIntent, MovementMode, PlayerController } from '../player/PlayerController';
import type { Collision } from '../world/Collision';
import type { Seabed } from '../world/Seabed';

const D2R = Math.PI / 180;
const _a = new THREE.Vector3();
const _b = new THREE.Vector3();
const _e = new THREE.Vector3();
const _s = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _tilt = new THREE.Euler();

/** Wrap an angle in degrees to -180..180. */
export function wrapDeg(a: number): number {
  return ((((a + 180) % 360) + 360) % 360) - 180;
}

/**
 * The rowboat: a model floating on the waves at a map position + heading, with simple forgiving
 * handling (the boat turns toward the stick direction and pulls forward) and grounding against the
 * seabed and piers. Rendering runs every frame; driving only while the cat is aboard (see InBoat).
 */
export class Boat {
  readonly root: THREE.Object3D;
  x = 0;
  z = 0;
  /** Heading in degrees (layout convention: 0 = south/+z, 90 = east). */
  yaw = 0;
  /** Forward speed (m/s). */
  speed = 0;
  aboard = false;
  motor = false;
  /** Called when the boat touches ground or reaches the edge of the sea (for a toast). */
  onBlocked: ((why: 'aground' | 'range') => void) | null = null;
  private seat: THREE.Object3D;
  private oars: THREE.Object3D[] = [];
  private outboard: THREE.Object3D;
  private prop: THREE.Object3D | null;
  private rowPhase = 0;
  private time = 0;
  private blockedCooldown = 0;

  constructor(
    assets: Assets,
    private seabed: Seabed,
    private collision: Collision,
  ) {
    this.root = assets.get('props/rowboat');
    this.root.traverse((o) => (o.castShadow = true));
    this.seat = this.root.getObjectByName('ANCHOR_seat') ?? this.root;
    for (const n of ['oar_L', 'oar_R']) {
      const o = this.root.getObjectByName(n);
      if (o) this.oars.push(o);
    }
    this.outboard = assets.get('props/outboard');
    this.prop = this.outboard.getObjectByName('prop') ?? null;
    (this.root.getObjectByName('ANCHOR_motor') ?? this.root).add(this.outboard);
    this.outboard.visible = false;
  }

  setMotor(on: boolean): void {
    this.motor = on;
    this.outboard.visible = on;
  }

  place(x: number, z: number, yaw: number): void {
    this.x = x;
    this.z = z;
    this.yaw = yaw;
    this.speed = 0;
    this.updateVisual(0);
  }

  /** World position where the cat sits. */
  seatPosition(out = new THREE.Vector3()): THREE.Vector3 {
    this.root.updateMatrixWorld(true);
    return this.seat.getWorldPosition(out);
  }

  /** Forward direction in world space (tangent). */
  forward(out = new THREE.Vector3()): THREE.Vector3 {
    mapToWorld(this.x + Math.sin(this.yaw * D2R) * 0.5, this.z + Math.cos(this.yaw * D2R) * 0.5, 0, out);
    mapToWorld(this.x - Math.sin(this.yaw * D2R) * 0.5, this.z - Math.cos(this.yaw * D2R) * 0.5, 0, _a);
    return out.sub(_a).normalize();
  }

  /** Steer with a camera-relative wish direction (world tangent, length 0..1). */
  drive(wish: THREE.Vector3, sprint: boolean, dt: number): void {
    const S = BOAT_SETTINGS;
    this.blockedCooldown -= dt;
    // wish direction -> map heading (local east/south axes at the boat)
    mapToWorld(this.x + 0.5, this.z, 0, _e).sub(mapToWorld(this.x - 0.5, this.z, 0, _a)).normalize();
    mapToWorld(this.x, this.z + 0.5, 0, _s).sub(mapToWorld(this.x, this.z - 0.5, 0, _a)).normalize();
    const mag = Math.min(1, wish.length());
    let target = 0;
    if (mag > 0.1) {
      const want = Math.atan2(wish.dot(_e), wish.dot(_s)) / D2R;
      const diff = wrapDeg(want - this.yaw);
      const turn = Math.sign(diff) * Math.min(Math.abs(diff), S.turnRate * (this.motor ? 1.15 : 1) * dt);
      this.yaw = wrapDeg(this.yaw + turn);
      const top = this.motor ? (sprint ? S.motorSprint : S.motorSpeed) : sprint ? S.rowSprint : S.rowSpeed;
      // pull forward only when roughly facing the wish direction; turn in place otherwise
      target = top * mag * Math.max(0, Math.cos(diff * D2R)) ** 1.5;
    }
    const rate = target > this.speed ? 2.5 / S.accel : 1 / S.drag;
    this.speed += (target - this.speed) * (1 - Math.exp(-dt * rate));
    if (Math.abs(this.speed) < 0.01 && target === 0) this.speed = 0;
    this.move(dt);
  }

  private move(dt: number): void {
    const S = BOAT_SETTINGS;
    const fx = Math.sin(this.yaw * D2R);
    const fz = Math.cos(this.yaw * D2R);
    const nx = this.x + fx * this.speed * dt;
    const nz = this.z + fz * this.speed * dt;
    const stuckHere = this.blocked(this.x, this.z, this.yaw);
    if (stuckHere || !this.blocked(nx, nz, this.yaw)) {
      this.x = nx;
      this.z = nz;
    } else if (!this.blocked(nx, this.z, this.yaw)) {
      this.x = nx;
      this.speed *= 0.9;
    } else if (!this.blocked(this.x, nz, this.yaw)) {
      this.z = nz;
      this.speed *= 0.9;
    } else {
      if (Math.abs(this.speed) > 1.2 && this.blockedCooldown <= 0) {
        this.blockedCooldown = 4;
        this.onBlocked?.('aground');
      }
      this.speed *= -0.25;
    }
    // the open sea ends somewhere: a gentle current pushes back toward the island
    const d = Math.hypot(this.x, this.z);
    if (d > S.maxRange) {
      this.x *= S.maxRange / d;
      this.z *= S.maxRange / d;
      this.speed *= 0.5;
      if (this.blockedCooldown <= 0) {
        this.blockedCooldown = 4;
        this.onBlocked?.('range');
      }
    }
  }

  /** True if the hull at this pose would touch shallow ground or an obstacle (pier posts, mangroves…). */
  blocked(x: number, z: number, yaw: number): boolean {
    const S = BOAT_SETTINGS;
    const fx = Math.sin(yaw * D2R);
    const fz = Math.cos(yaw * D2R);
    const pts: [number, number][] = [
      [S.halfLength, 0], [-S.halfLength, 0], [S.halfLength * 0.4, S.halfWidth], [S.halfLength * 0.4, -S.halfWidth],
      [-S.halfLength * 0.6, S.halfWidth], [-S.halfLength * 0.6, -S.halfWidth],
    ];
    for (const [f, r] of pts) {
      const px = x + fx * f + fz * r;
      const pz = z + fz * f - fx * r;
      if (this.seabed.height(px, pz) > -S.draft) return true;
    }
    // obstacles poking out of the water (posts, pier skirts, mangrove roots): a ray along the keel line
    mapToWorld(x - fx * S.halfLength, z - fz * S.halfLength, 0.45, _a);
    mapToWorld(x + fx * (S.halfLength + 0.2), z + fz * (S.halfLength + 0.2), 0.45, _b);
    const len = _a.distanceTo(_b);
    if (this.collision.raycast(_a, _b.sub(_a).normalize(), len)) return true;
    return false;
  }

  /** Float on the waves, rock gently, animate oars / propeller. */
  updateVisual(dt: number): void {
    this.time += dt;
    const S = BOAT_SETTINGS;
    const t = this.time;
    const fx = Math.sin(this.yaw * D2R);
    const fz = Math.cos(this.yaw * D2R);
    const hBow = Water.waveHeight(this.x + fx * S.halfLength, this.z + fz * S.halfLength, t);
    const hStern = Water.waveHeight(this.x - fx * S.halfLength, this.z - fz * S.halfLength, t);
    const hL = Water.waveHeight(this.x + fz, this.z - fx, t);
    const hR = Water.waveHeight(this.x - fz, this.z + fx, t);
    const h = (hBow + hStern + hL + hR) / 4;
    mapToWorld(this.x, this.z, h - S.sink, this.root.position);
    orientationAt(this.x, this.z, this.yaw, this.root.quaternion);
    // pitch (bow up/down) + roll; a little bow lift when going fast
    const pitch = Math.atan2(hStern - hBow, 2 * S.halfLength) * 1.4 - Math.min(0.08, Math.abs(this.speed) * 0.008);
    const roll = Math.atan2(hL - hR, 2) * 1.2;
    _tilt.set(pitch, 0, roll);
    this.root.quaternion.multiply(_q.setFromEuler(_tilt));

    // oars: stroke while rowing, resting otherwise; stowed along the hull with the motor
    const rowing = this.aboard && !this.motor && Math.abs(this.speed) > 0.15;
    if (rowing) this.rowPhase += dt * (2.2 + Math.abs(this.speed) * 0.5);
    this.oars.forEach((o, i) => {
      const side = i === 0 ? -1 : 1;
      if (this.motor) {
        o.rotation.set(0, side * 1.52, side * 0.42);
        return;
      }
      const ph = this.rowPhase;
      const sweep = rowing ? Math.sin(ph) * 0.55 : 0.15;
      const lift = rowing ? Math.max(0, Math.cos(ph)) * 0.25 : 0.1;
      o.rotation.set(0, side * sweep, side * lift);
    });
    if (this.prop && this.motor) this.prop.rotation.y += dt * (this.aboard ? 6 + Math.abs(this.speed) * 6 : 0);
  }
}

/** Movement mode while sitting in the boat: the stick steers the boat, the cat rides on the seat. */
export class InBoat implements MovementMode {
  readonly id = 'inBoat';
  constructor(readonly boat: Boat) {}

  update(p: PlayerController, intent: MoveIntent, dt: number): void {
    const b = this.boat;
    b.drive(intent.dir, intent.sprint, dt);
    b.updateVisual(dt);
    b.seatPosition(p.position);
    p.velocity.set(0, 0, 0);
    p.grounded = true;
    p.inWater = false;
    p.speed = Math.abs(b.speed);
    // the cat looks where the boat goes (it may still turn freely on the seat to aim a cast)
    if (intent.dir.lengthSq() > 0.01 || Math.abs(b.speed) > 0.3) {
      const up = upAt(p.position, _a);
      p.faceToward(toTangent(b.forward(_b), up), dt, 6);
    }
  }
}

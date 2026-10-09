import * as THREE from 'three';
import { findNode } from '../core/Assets';

export type Pose =
  | 'idle' | 'stand' | 'walk' | 'run' | 'jump' | 'swim'
  | 'charge' | 'cast' | 'fishing' | 'reel' | 'hold'
  | 'sit' | 'lie' | 'talk' | 'wave' | 'celebrate';

const PART_NAMES = ['body', 'head', 'arm_L', 'arm_R', 'leg_L', 'leg_R', 'tail'] as const;
type PartName = (typeof PART_NAMES)[number];

interface Part {
  node: THREE.Object3D;
  restPos: THREE.Vector3;
  restQuat: THREE.Quaternion;
}

const _e = new THREE.Euler();
const _q = new THREE.Quaternion();

/**
 * A cartoon animal built from rigid parts (see art/_lib/animals.py). Animation is procedural:
 * each pose sets Euler offsets per part which are blended smoothly toward their targets.
 */
export class Character {
  readonly root = new THREE.Group();
  readonly model: THREE.Object3D;
  private parts = new Map<PartName, Part>();
  private cur = new Map<PartName, THREE.Vector3>();
  private bodyLift = 0;
  pose: Pose = 'idle';
  /** 0..1 progress for one-shot poses (cast). */
  poseT = 0;
  /** Horizontal speed (m/s) for walk cycles. */
  speed = 0;
  private phase = Math.random() * 10;
  private time = Math.random() * 10;

  constructor(model: THREE.Object3D) {
    this.model = model;
    this.root.add(model);
    for (const n of PART_NAMES) {
      const node = findNode(model, n);
      if (node) {
        this.parts.set(n, { node, restPos: node.position.clone(), restQuat: node.quaternion.clone() });
        this.cur.set(n, new THREE.Vector3());
      }
    }
  }

  anchor(name: string): THREE.Object3D | undefined {
    return findNode(this.model, name);
  }

  update(dt: number): void {
    this.time += dt;
    const t = this.time;
    const target = new Map<PartName, [number, number, number]>();
    const set = (n: PartName, x = 0, y = 0, z = 0) => target.set(n, [x, y, z]);
    let lift = 0;
    let rate = 12;

    switch (this.pose) {
      case 'walk':
      case 'run': {
        const run = this.pose === 'run';
        this.phase += dt * (4 + this.speed * (run ? 1.7 : 2.0));
        const s = Math.sin(this.phase);
        const amp = run ? 0.9 : 0.65;
        set('leg_L', -s * amp);
        set('leg_R', s * amp);
        set('arm_L', s * amp * 0.8, 0, 0.1);
        set('arm_R', -s * amp * 0.8, 0, -0.1);
        set('body', run ? -0.12 : -0.05, 0, Math.sin(this.phase) * 0.05);
        set('head', run ? 0.08 : 0.03, Math.sin(this.phase) * 0.05);
        set('tail', 0.3, Math.sin(this.phase * 0.5) * 0.4);
        lift = Math.abs(Math.cos(this.phase)) * (run ? 0.07 : 0.045);
        rate = 20;
        break;
      }
      case 'jump':
        set('leg_L', -0.7);
        set('leg_R', 0.4);
        set('arm_L', -0.2, 0, 1.6);
        set('arm_R', -0.2, 0, -1.6);
        set('tail', 0.6);
        break;
      case 'swim': {
        const s = Math.sin(t * 5);
        set('body', -0.5);
        set('head', 0.45);
        set('arm_L', -1.6 + s * 0.6, 0, 0.3);
        set('arm_R', -1.6 - s * 0.6, 0, -0.3);
        set('leg_L', 0.6 + s * 0.5);
        set('leg_R', 0.6 - s * 0.5);
        break;
      }
      case 'charge':
        // rod raised back over the shoulder
        set('arm_R', 2.3, 0, -0.2);
        set('arm_L', -0.9, 0, 0.5);
        set('body', 0.12, 0.25);
        set('head', -0.05);
        set('leg_L', -0.3);
        set('leg_R', 0.2);
        rate = 8;
        break;
      case 'cast': {
        const k = Math.min(1, this.poseT * 3);
        set('arm_R', 2.3 - k * 3.4, 0, -0.2);
        set('arm_L', -0.9, 0, 0.4);
        set('body', 0.12 - k * 0.3, 0.25 - k * 0.4);
        set('leg_L', -0.3);
        set('leg_R', 0.2);
        rate = 30;
        break;
      }
      case 'fishing':
        set('arm_R', -0.9, 0, -0.15);
        set('arm_L', -0.8, 0, 0.45);
        set('body', -0.04 + Math.sin(t * 1.5) * 0.015);
        set('head', 0.08 + Math.sin(t * 0.7) * 0.05, Math.sin(t * 0.4) * 0.15);
        set('tail', 0, Math.sin(t * 1.2) * 0.5);
        break;
      case 'reel': {
        const s = Math.sin(t * 14);
        set('arm_R', -0.6 + s * 0.15, 0, -0.15);
        set('arm_L', -1.0 + Math.cos(t * 14) * 0.25, 0, 0.5);
        set('body', 0.15 + Math.sin(t * 3) * 0.04, Math.sin(t * 2.3) * 0.08);
        set('head', 0.15);
        set('leg_L', -0.35);
        set('leg_R', 0.25);
        set('tail', 0.5, Math.sin(t * 8) * 0.6);
        rate = 20;
        break;
      }
      case 'hold':
      case 'celebrate': {
        const bounce = Math.abs(Math.sin(t * 6));
        set('arm_L', -2.6, 0, 0.35);
        set('arm_R', -2.6, 0, -0.35);
        set('body', -0.05);
        set('head', -0.15);
        set('tail', 0.5, Math.sin(t * 9) * 0.7);
        lift = this.pose === 'celebrate' ? bounce * 0.12 : 0;
        break;
      }
      case 'sit':
        set('leg_L', -1.45, 0, 0.1);
        set('leg_R', -1.45, 0, -0.1);
        set('arm_R', -0.7, 0, -0.1);
        set('arm_L', -0.3, 0, 0.3);
        set('body', Math.sin(t * 1.4) * 0.02);
        set('head', 0.12 + Math.sin(t * 0.5) * 0.06, Math.sin(t * 0.3) * 0.2);
        break;
      case 'lie':
        set('arm_L', -0.3 + Math.sin(t * 0.8) * 0.1, 0, 0.9);
        set('arm_R', -0.3 - Math.sin(t * 0.8) * 0.1, 0, -0.9);
        set('head', Math.sin(t * 0.6) * 0.06, 0.3);
        set('body', 0, 0, Math.sin(t * 0.9) * 0.03);
        rate = 4;
        break;
      case 'talk':
        set('head', Math.sin(t * 7) * 0.08, Math.sin(t * 2) * 0.12);
        set('arm_L', -0.6 + Math.sin(t * 4) * 0.3, 0, 0.5);
        set('arm_R', -0.2, 0, -0.2);
        set('body', Math.sin(t * 2) * 0.03);
        set('tail', 0, Math.sin(t * 3) * 0.5);
        break;
      case 'wave':
        set('arm_L', -2.7, 0, 0.4 + Math.sin(t * 10) * 0.35);
        set('head', 0, 0, Math.sin(t * 2) * 0.1);
        set('tail', 0.3, Math.sin(t * 6) * 0.6);
        break;
      default: // idle
        set('body', Math.sin(t * 1.6) * 0.02);
        set('head', Math.sin(t * 0.9) * 0.05, Math.sin(t * 0.37) * 0.25);
        set('arm_L', Math.sin(t * 1.6) * 0.05, 0, 0.08);
        set('arm_R', -Math.sin(t * 1.6) * 0.05, 0, -0.08);
        set('tail', 0.15, Math.sin(t * 1.3) * 0.5);
        break;
    }

    const k = 1 - Math.exp(-rate * dt);
    for (const [name, part] of this.parts) {
      const tgt = target.get(name) ?? [0, 0, 0];
      const c = this.cur.get(name)!;
      c.x += (tgt[0] - c.x) * k;
      c.y += (tgt[1] - c.y) * k;
      c.z += (tgt[2] - c.z) * k;
      _q.setFromEuler(_e.set(c.x, c.y, c.z));
      part.node.quaternion.copy(part.restQuat).multiply(_q);
    }
    this.bodyLift += (lift - this.bodyLift) * Math.min(1, dt * 25);
    const body = this.parts.get('body');
    if (body) body.node.position.copy(body.restPos).setY(body.restPos.y + this.bodyLift);
    if (this.pose === 'idle') {
      const s = 1 + Math.sin(t * 1.6) * 0.015;
      body?.node.scale.set(1, s, 1);
    } else body?.node.scale.set(1, 1, 1);
  }
}

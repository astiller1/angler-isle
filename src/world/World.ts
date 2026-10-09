import * as THREE from 'three';
import { MeshBVH } from 'three-mesh-bvh';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import shape from '../../art/terrain/island_shape.json';
import { paletteMaterial, type Assets } from '../core/Assets';
import { bendGeometry, bendPoint, mapToWorld, orientationAt, rotateLocal } from '../planet/Planet';
import { PLACEMENTS, SCATTER } from '../data/layout';
import type { Placement, ScatterRule } from '../data/types';
import { Collision } from './Collision';
import { Seabed } from './Seabed';

export interface AnchorInfo {
  /** World position. */
  pos: THREE.Vector3;
  /** Map position + height. */
  x: number;
  z: number;
  h: number;
  /** Facing of the model that owns the anchor (degrees, layout convention). */
  rot: number;
}

interface Footprint {
  x: number;
  z: number;
  rot: number;
  min: THREE.Vector2;
  max: THREE.Vector2;
}

/** Size (m) of the spatial chunks used to batch instanced scatter. */
const CHUNK = 45;

/** Deterministic PRNG (mulberry32). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Builds the island: terrain, bent static structures (merged), instanced scatter, anchors, collision. */
export class World {
  readonly root = new THREE.Group();
  readonly collision = new Collision();
  readonly anchors = new Map<string, AnchorInfo>();
  seabed!: Seabed;
  private footprints: Footprint[] = [];

  constructor(private assets: Assets) {
    this.root.name = 'world';
  }

  build(placements: Placement[] = PLACEMENTS, scatter: ScatterRule[] = SCATTER): void {
    // 1) terrain (also the seabed height field, sampled from the terrain alone)
    const terrain = this.assets.get('terrain/island');
    const terrainGeoms: THREE.BufferGeometry[] = [];
    terrain.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      m.castShadow = false;
      m.receiveShadow = true;
      this.collision.addMesh(m);
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', m.geometry.getAttribute('position'));
      g.setIndex(m.geometry.index);
      terrainGeoms.push(g);
    });
    this.root.add(terrain);
    this.seabed = new Seabed(new MeshBVH(terrainGeoms[0]));

    // 2) static structures, bent onto the planet and merged into one draw call
    const statics: THREE.BufferGeometry[] = [];
    for (const p of placements) statics.push(...this.placeStatic(p));
    if (statics.length) {
      const merged = mergeGeometries(statics, false);
      if (merged) {
        const mesh = new THREE.Mesh(merged, paletteMaterial);
        mesh.name = 'structures';
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        this.root.add(mesh);
      }
    }

    // 3) instanced vegetation & rocks
    for (const rule of scatter) this.scatter(rule);

    this.collision.build();
  }

  anchor(name: string): AnchorInfo {
    const a = this.anchors.get(name);
    if (!a) throw new Error(`Missing anchor ${name}`);
    return a;
  }

  private placeStatic(p: Placement): THREE.BufferGeometry[] {
    const src = this.assets.source(p.model);
    src.updateMatrixWorld(true);
    const rot = p.rot ?? 0;
    const baseH = p.h === undefined || p.h === 'ground' ? this.seabed.height(p.x, p.z) : p.h;
    const out: THREE.BufferGeometry[] = [];
    const box = new THREE.Box3();
    src.traverse((o) => {
      if (o.name.startsWith('ANCHOR_')) {
        const local = o.getWorldPosition(new THREE.Vector3());
        const pos = bendPoint(local, p.x, p.z, rot, baseH);
        const [dx, dz] = rotateLocal(local.x, local.z, rot);
        this.anchors.set(o.name, { pos, x: p.x + dx, z: p.z + dz, h: baseH + local.y, rot });
        return;
      }
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      const g = m.geometry.clone();
      g.applyMatrix4(m.matrixWorld);
      g.computeBoundingBox();
      if (!m.name.startsWith('COL_')) box.union(g.boundingBox!);
      bendGeometry(g, p.x, p.z, rot, baseH);
      if (m.name.startsWith('COL_')) this.collision.addGeometry(g);
      else {
        for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'color'].includes(k)) g.deleteAttribute(k);
        out.push(g);
      }
    });
    if (!box.isEmpty()) this.footprints.push({ x: p.x, z: p.z, rot, min: new THREE.Vector2(box.min.x, box.min.z), max: new THREE.Vector2(box.max.x, box.max.z) });
    return out;
  }

  /** True if (x, z) lies within a placed structure's footprint (+margin). */
  isBlocked(x: number, z: number, margin = 1): boolean {
    for (const f of this.footprints) {
      // inverse rotation into the model's local frame
      const [lx, lz] = rotateLocal(x - f.x, z - f.z, -f.rot);
      if (lx > f.min.x - margin && lx < f.max.x + margin && lz > f.min.y - margin && lz < f.max.y + margin) return true;
    }
    return false;
  }

  /** Distance to the nearest path edge (negative = on the path). */
  pathDistance(x: number, z: number): number {
    let best = Infinity;
    for (const p of shape.paths) {
      const pts = p.pts as [number, number][];
      for (let i = 0; i < pts.length - 1; i++) {
        const [ax, az] = pts[i];
        const [bx, bz] = pts[i + 1];
        const dx = bx - ax;
        const dz = bz - az;
        const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)));
        best = Math.min(best, Math.hypot(x - ax - dx * t, z - az - dz * t) - p.w / 2);
      }
    }
    return best;
  }

  private scatter(rule: ScatterRule): void {
    const rand = mulberry32(rule.seed * 7919 + 13);
    const accepted: { x: number; z: number; model: string; yaw: number; s: number; h: number }[] = [];
    const area = rule.area === 'island' ? { x: 0, z: 0, r: 135 } : rule.area;
    const grad = new THREE.Vector2();
    for (let tries = 0; tries < rule.count * 30 && accepted.length < rule.count; tries++) {
      const a = rand() * Math.PI * 2;
      const r = Math.sqrt(rand()) * area.r;
      const x = area.x + Math.cos(a) * r;
      const z = area.z + Math.sin(a) * r;
      const h = this.seabed.height(x, z);
      if (h < rule.minH || h > rule.maxH) continue;
      if (rule.maxSlope !== undefined && this.seabed.gradient(x, z, grad).length() > rule.maxSlope) continue;
      if (this.pathDistance(x, z) < (rule.pathMargin ?? 1)) continue;
      if (this.isBlocked(x, z, 1.2)) continue;
      if (accepted.some((p) => Math.hypot(p.x - x, p.z - z) < rule.spacing)) continue;
      accepted.push({
        x, z, h,
        model: rule.models[Math.floor(rand() * rule.models.length)],
        yaw: rand() * 360,
        s: rule.scale[0] + rand() * (rule.scale[1] - rule.scale[0]),
      });
    }
    // group by model and by spatial chunk so frustum/shadow culling can skip far-away groups
    const byModel = new Map<string, typeof accepted>();
    for (const p of accepted) {
      const key = `${p.model}|${Math.floor(p.x / CHUNK)},${Math.floor(p.z / CHUNK)}`;
      if (!byModel.has(key)) byModel.set(key, []);
      byModel.get(key)!.push(p);
    }
    const q = new THREE.Quaternion();
    const pos = new THREE.Vector3();
    const scl = new THREE.Vector3();
    const mat = new THREE.Matrix4();
    for (const [key, list] of byModel) {
      const model = key.split('|')[0];
      const matrices = list.map((p) => {
        orientationAt(p.x, p.z, p.yaw, q);
        mapToWorld(p.x, p.z, p.h - (rule.sink ?? 0) * p.s, pos);
        return new THREE.Matrix4().compose(pos, q, scl.setScalar(p.s));
      });
      const src = this.assets.source(model);
      src.updateMatrixWorld(true);
      src.traverse((o) => {
        const m = o as THREE.Mesh;
        if (!m.isMesh) return;
        const g = m.geometry.clone().applyMatrix4(m.matrixWorld);
        if (m.name.startsWith('COL_')) {
          if (rule.collide) for (const M of matrices) this.collision.addGeometry(g, M);
          return;
        }
        const inst = new THREE.InstancedMesh(g, paletteMaterial, matrices.length);
        matrices.forEach((M, i) => inst.setMatrixAt(i, mat.copy(M)));
        inst.instanceMatrix.needsUpdate = true;
        inst.computeBoundingSphere();
        inst.castShadow = rule.collide && !model.includes('bush') && !model.includes('pebble');
        inst.receiveShadow = true;
        inst.name = `scatter:${model}`;
        this.root.add(inst);
      });
    }
  }
}

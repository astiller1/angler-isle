import * as THREE from 'three';
import { mapToWorld } from '../planet/Planet';
import type { MeshBVH } from 'three-mesh-bvh';

/**
 * A CPU height field of the *terrain only* (no props), sampled by raycasting the island mesh.
 * Used for the water shader (depth → color/foam), deep-water checks and placing things on the ground.
 */
export class Seabed {
  readonly size: number;
  readonly half: number;
  readonly data: Float32Array;
  readonly texture: THREE.DataTexture;
  static readonly NONE = -20;

  constructor(terrainBvh: MeshBVH, half = 180, size = 256) {
    this.size = size;
    this.half = half;
    this.data = new Float32Array(size * size);
    const ray = new THREE.Ray();
    const top = new THREE.Vector3();
    const R = mapToWorld(0, 0, 0).y;
    for (let j = 0; j < size; j++) {
      for (let i = 0; i < size; i++) {
        const x = -half + (2 * half * i) / (size - 1);
        const z = -half + (2 * half * j) / (size - 1);
        mapToWorld(x, z, 60, top);
        ray.origin.copy(top);
        ray.direction.copy(top).normalize().negate();
        const hit = terrainBvh.raycastFirst(ray, THREE.DoubleSide);
        this.data[j * size + i] = hit ? hit.point.length() - R : Seabed.NONE;
      }
    }
    const half16 = new Uint16Array(size * size);
    for (let k = 0; k < half16.length; k++) half16[k] = THREE.DataUtils.toHalfFloat(this.data[k]);
    this.texture = new THREE.DataTexture(half16, size, size, THREE.RedFormat, THREE.HalfFloatType);
    this.texture.magFilter = THREE.LinearFilter;
    this.texture.minFilter = THREE.LinearFilter;
    this.texture.wrapS = this.texture.wrapT = THREE.ClampToEdgeWrapping;
    this.texture.needsUpdate = true;
  }

  /** Terrain height at map (x, z), bilinear. */
  height(x: number, z: number): number {
    const n = this.size - 1;
    const fx = ((x + this.half) / (2 * this.half)) * n;
    const fz = ((z + this.half) / (2 * this.half)) * n;
    if (fx < 0 || fz < 0 || fx > n || fz > n) return Seabed.NONE;
    const i = Math.min(Math.floor(fx), n - 1);
    const j = Math.min(Math.floor(fz), n - 1);
    const tx = fx - i;
    const tz = fz - j;
    const d = this.data;
    const s = this.size;
    const a = d[j * s + i] * (1 - tx) + d[j * s + i + 1] * tx;
    const b = d[(j + 1) * s + i] * (1 - tx) + d[(j + 1) * s + i + 1] * tx;
    return a * (1 - tz) + b * tz;
  }

  /** Uphill gradient (dh/dx, dh/dz). */
  gradient(x: number, z: number, out = new THREE.Vector2()): THREE.Vector2 {
    const e = 1.5;
    return out.set(
      (this.height(x + e, z) - this.height(x - e, z)) / (2 * e),
      (this.height(x, z + e) - this.height(x, z - e)) / (2 * e),
    );
  }

  isWater(x: number, z: number, minDepth = 0.05): boolean {
    return this.height(x, z) < -minDepth;
  }
}

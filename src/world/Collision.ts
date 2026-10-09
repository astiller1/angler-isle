import * as THREE from 'three';
import { MeshBVH } from 'three-mesh-bvh';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/** Collision proxy names: COL_* = solid, COLP_* = player-only. */
export function isCollisionName(name: string): boolean {
  return /^COLP?_/.test(name);
}

/**
 * Static collision world: every walkable/blocking surface (terrain + COL_* proxies + bent props)
 * merged into one BVH. Build once after the world is assembled.
 */
export class Collision {
  private parts: THREE.BufferGeometry[] = [];
  private solidParts: THREE.BufferGeometry[] = [];
  /** Everything the player collides with. */
  bvh: MeshBVH | null = null;
  /** Only solid things (terrain, walls, rocks) — used by the camera so railings and trunks do not yank it. */
  solidBvh: MeshBVH | null = null;
  mesh: THREE.Mesh | null = null;

  /** Add a mesh's geometry in world space (positions only). */
  addMesh(mesh: THREE.Mesh): void {
    mesh.updateWorldMatrix(true, false);
    this.addGeometry(mesh.geometry, mesh.matrixWorld);
  }

  addGeometry(geom: THREE.BufferGeometry, matrix?: THREE.Matrix4, solid = true): void {
    let g = new THREE.BufferGeometry();
    g.setAttribute('position', geom.getAttribute('position').clone());
    if (geom.index) g.setIndex(geom.index.clone());
    g = g.index ? g.toNonIndexed() : g;
    if (matrix) g.applyMatrix4(matrix);
    this.parts.push(g);
    if (solid) this.solidParts.push(g);
  }

  build(): void {
    const merged = mergeGeometries(this.parts, false);
    if (!merged) throw new Error('collision merge failed');
    this.parts = [];
    this.bvh = new MeshBVH(merged);
    const solid = mergeGeometries(this.solidParts, false);
    this.solidParts = [];
    this.solidBvh = solid ? new MeshBVH(solid) : this.bvh;
    this.mesh = new THREE.Mesh(merged, new THREE.MeshBasicMaterial({ wireframe: true, color: 0xff00ff }));
    this.mesh.visible = false;
  }

  private _ray = new THREE.Ray();
  /** First hit along a ray (both faces). Returns distance or Infinity. */
  raycast(origin: THREE.Vector3, dir: THREE.Vector3, maxDist = Infinity, solidOnly = false): { distance: number; point: THREE.Vector3 } | null {
    const bvh = solidOnly ? this.solidBvh : this.bvh;
    if (!bvh) return null;
    this._ray.origin.copy(origin);
    this._ray.direction.copy(dir);
    const hit = bvh.raycastFirst(this._ray, THREE.DoubleSide);
    if (!hit || hit.distance > maxDist) return null;
    return { distance: hit.distance, point: hit.point };
  }
}

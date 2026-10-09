import * as THREE from 'three';
import { MeshBVH } from 'three-mesh-bvh';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/**
 * Static collision world: every walkable/blocking surface (terrain + COL_* proxies + bent props)
 * merged into one BVH. Build once after the world is assembled.
 */
export class Collision {
  private parts: THREE.BufferGeometry[] = [];
  bvh: MeshBVH | null = null;
  mesh: THREE.Mesh | null = null;

  /** Add a mesh's geometry in world space (positions only). */
  addMesh(mesh: THREE.Mesh): void {
    mesh.updateWorldMatrix(true, false);
    this.addGeometry(mesh.geometry, mesh.matrixWorld);
  }

  addGeometry(geom: THREE.BufferGeometry, matrix?: THREE.Matrix4): void {
    let g = new THREE.BufferGeometry();
    g.setAttribute('position', geom.getAttribute('position').clone());
    if (geom.index) g.setIndex(geom.index.clone());
    g = g.index ? g.toNonIndexed() : g;
    if (matrix) g.applyMatrix4(matrix);
    this.parts.push(g);
  }

  build(): void {
    const merged = mergeGeometries(this.parts, false);
    if (!merged) throw new Error('collision merge failed');
    this.parts = [];
    this.bvh = new MeshBVH(merged);
    this.mesh = new THREE.Mesh(merged, new THREE.MeshBasicMaterial({ wireframe: true, color: 0xff00ff }));
    this.mesh.visible = false;
  }

  private _ray = new THREE.Ray();
  /** First hit along a ray (both faces). Returns distance or Infinity. */
  raycast(origin: THREE.Vector3, dir: THREE.Vector3, maxDist = Infinity): { distance: number; point: THREE.Vector3 } | null {
    if (!this.bvh) return null;
    this._ray.origin.copy(origin);
    this._ray.direction.copy(dir);
    const hit = this.bvh.raycastFirst(this._ray, THREE.DoubleSide);
    if (!hit || hit.distance > maxDist) return null;
    return { distance: hit.distance, point: hit.point };
  }
}

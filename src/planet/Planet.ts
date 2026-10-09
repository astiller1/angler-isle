import * as THREE from 'three';
import shape from '../../art/terrain/island_shape.json';

/**
 * All sphere math lives here. The planet center is the world origin and the island sits at the
 * north pole (+Y). Map coordinates (x = east, z = south, meters) use an azimuthal equidistant
 * projection around the pole; `h` is the height above sea level (sea level = planet radius).
 */
export const PLANET_RADIUS: number = shape.planetRadius;
const R = PLANET_RADIUS;

export interface MapPoint {
  x: number;
  z: number;
  h: number;
}

export function mapToWorld(x: number, z: number, h = 0, out = new THREE.Vector3()): THREE.Vector3 {
  const d = Math.hypot(x, z);
  const th = d / R;
  const s = d > 1e-9 ? Math.sin(th) / d : 1 / R;
  const r = R + h;
  return out.set(x * s * r, Math.cos(th) * r, z * s * r);
}

export function worldToMap(p: THREE.Vector3, out: MapPoint = { x: 0, z: 0, h: 0 }): MapPoint {
  const r = p.length();
  const th = Math.acos(THREE.MathUtils.clamp(p.y / r, -1, 1));
  const hor = Math.hypot(p.x, p.z);
  const k = hor > 1e-9 ? (th * R) / hor : 0;
  out.x = p.x * k;
  out.z = p.z * k;
  out.h = r - R;
  return out;
}

/** Height above sea level of a world position. */
export function heightOf(p: THREE.Vector3): number {
  return p.length() - R;
}

/** Local "up" (away from the planet center). */
export function upAt(p: THREE.Vector3, out = new THREE.Vector3()): THREE.Vector3 {
  return out.copy(p).normalize();
}

const _Y = new THREE.Vector3(0, 1, 0);
const _dir = new THREE.Vector3();
const _q = new THREE.Quaternion();

/**
 * Orientation of a model standing at map (x, z) and rotated by `yawDeg` (0 = model +Z faces map
 * south (+z), 90 = east). Consistent with the projection's local axes.
 */
export function orientationAt(x: number, z: number, yawDeg = 0, out = new THREE.Quaternion()): THREE.Quaternion {
  mapToWorld(x, z, 0, _dir).normalize();
  out.setFromUnitVectors(_Y, _dir);
  _q.setFromAxisAngle(_Y, THREE.MathUtils.degToRad(yawDeg));
  return out.multiply(_q);
}

/** Orientation from an up vector and a (roughly tangent) forward vector; model +Z = forward. */
const _x = new THREE.Vector3();
const _z = new THREE.Vector3();
const _m = new THREE.Matrix4();
export function lookOrientation(up: THREE.Vector3, forward: THREE.Vector3, out = new THREE.Quaternion()): THREE.Quaternion {
  _z.copy(forward).addScaledVector(up, -forward.dot(up));
  if (_z.lengthSq() < 1e-8) _z.set(1, 0, 0).addScaledVector(up, -up.x);
  _z.normalize();
  _x.crossVectors(up, _z).normalize();
  _m.makeBasis(_x, up, _z);
  return out.setFromRotationMatrix(_m);
}

/** Project a vector onto the tangent plane at `up` (in place) and normalize it. */
export function toTangent(v: THREE.Vector3, up: THREE.Vector3): THREE.Vector3 {
  v.addScaledVector(up, -v.dot(up));
  const l = v.length();
  if (l < 1e-8) {
    v.set(1, 0, 0).addScaledVector(up, -up.x);
  }
  return v.normalize();
}

/** Rotate a local (x, z) offset by yaw (same convention as orientationAt). */
export function rotateLocal(lx: number, lz: number, yawDeg: number): [number, number] {
  const yaw = THREE.MathUtils.degToRad(yawDeg);
  const c = Math.cos(yaw);
  const s = Math.sin(yaw);
  return [lx * c + lz * s, -lx * s + lz * c];
}

/** Map a model-local point to its bent world position (see bendGeometry). */
export function bendPoint(local: THREE.Vector3, x: number, z: number, yawDeg: number, baseH: number, out = new THREE.Vector3()): THREE.Vector3 {
  const [dx, dz] = rotateLocal(local.x, local.z, yawDeg);
  return mapToWorld(x + dx, z + dz, baseH + local.y, out);
}

/**
 * Bend a model's geometry onto the planet: local (lx, ly, lz) -> map (x, z) offset rotated by yaw,
 * height = baseH + ly. Used for static props so long structures (piers) follow the curvature.
 */
export function bendGeometry(geom: THREE.BufferGeometry, x: number, z: number, yawDeg: number, baseH: number): void {
  const pos = geom.getAttribute('position') as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    bendPoint(v.fromBufferAttribute(pos, i), x, z, yawDeg, baseH, v);
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  pos.needsUpdate = true;
  const nrm = geom.getAttribute('normal') as THREE.BufferAttribute | undefined;
  if (nrm) {
    const q = orientationAt(x, z, yawDeg);
    for (let i = 0; i < nrm.count; i++) {
      v.fromBufferAttribute(nrm, i).applyQuaternion(q);
      nrm.setXYZ(i, v.x, v.y, v.z);
    }
    nrm.needsUpdate = true;
  }
  geom.computeBoundingBox();
  geom.computeBoundingSphere();
}

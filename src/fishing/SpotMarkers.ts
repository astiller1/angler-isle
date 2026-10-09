import * as THREE from 'three';
import { SPOTS } from '../data/spots';
import { mapToWorld, orientationAt } from '../planet/Planet';
import { Water } from '../planet/Water';
import type { Seabed } from '../world/Seabed';

interface Bubble {
  x: number;
  z: number;
  t: number;
  period: number;
}

interface Shadow {
  cx: number;
  cz: number;
  r: number;
  speed: number;
  phase: number;
  size: number;
}

/** Bubbles and swimming fish shadows that make fishing spots discoverable. */
export class SpotMarkers {
  readonly root = new THREE.Group();
  private bubbles: Bubble[] = [];
  private bubbleMesh: THREE.InstancedMesh;
  private shadows: Shadow[] = [];
  private shadowMesh: THREE.InstancedMesh;
  private m = new THREE.Matrix4();
  private q = new THREE.Quaternion();
  private p = new THREE.Vector3();
  private s = new THREE.Vector3();

  constructor(seabed: Seabed) {
    let seed = 7;
    const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (const spot of SPOTS) {
      if (spot.access !== 'shore') continue;
      let made = 0;
      for (let k = 0; k < 120 && made < 16; k++) {
        const a = rand() * Math.PI * 2;
        const r = Math.sqrt(rand()) * spot.radius * 0.85;
        const x = spot.x + Math.cos(a) * r;
        const z = spot.z + Math.sin(a) * r;
        if (!seabed.isWater(x, z, 0.3)) continue;
        this.bubbles.push({ x, z, t: rand() * 3, period: 1.4 + rand() * 1.8 });
        made++;
      }
      for (let k = 0; k < 3; k++) {
        this.shadows.push({ cx: spot.x, cz: spot.z, r: spot.radius * (0.3 + rand() * 0.45), speed: (0.15 + rand() * 0.2) * (rand() < 0.5 ? -1 : 1), phase: rand() * 6, size: 0.6 + rand() * 0.5 });
      }
    }
    const bubbleMat = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.85 });
    this.bubbleMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(0.11, 8, 6), bubbleMat, this.bubbles.length);
    this.bubbleMesh.frustumCulled = false;
    const shadowMat = new THREE.MeshBasicMaterial({ color: '#0d4a63', transparent: true, opacity: 0.32, depthWrite: false });
    const shadowGeo = new THREE.CircleGeometry(0.5, 12).rotateX(-Math.PI / 2).scale(0.45, 1, 1.2);
    this.shadowMesh = new THREE.InstancedMesh(shadowGeo, shadowMat, this.shadows.length);
    this.shadowMesh.frustumCulled = false;
    this.shadowMesh.renderOrder = 1;
    this.root.add(this.bubbleMesh, this.shadowMesh);
  }

  update(time: number, dt: number): void {
    this.bubbles.forEach((b, i) => {
      b.t += dt;
      const u = (b.t % b.period) / b.period;
      const scale = u < 0.75 ? 0.3 + u * 1.2 : Math.max(0.001, (1 - u) * 4);
      orientationAt(b.x, b.z, 0, this.q);
      mapToWorld(b.x, b.z, Water.waveHeight(b.x, b.z, time) + 0.02, this.p);
      this.m.compose(this.p, this.q, this.s.setScalar(scale));
      this.bubbleMesh.setMatrixAt(i, this.m);
    });
    this.bubbleMesh.instanceMatrix.needsUpdate = true;
    this.shadows.forEach((s, i) => {
      const a = s.phase + time * s.speed;
      const x = s.cx + Math.cos(a) * s.r;
      const z = s.cz + Math.sin(a) * s.r;
      const heading = THREE.MathUtils.radToDeg(Math.atan2(-Math.sin(a) * Math.sign(s.speed), Math.cos(a) * Math.sign(s.speed)));
      orientationAt(x, z, heading, this.q);
      // the water is opaque, so the "shadow" is a translucent dark patch riding the surface
      mapToWorld(x, z, Water.waveHeight(x, z, time) + 0.04, this.p);
      this.m.compose(this.p, this.q, this.s.setScalar(s.size));
      this.shadowMesh.setMatrixAt(i, this.m);
    });
    this.shadowMesh.instanceMatrix.needsUpdate = true;
  }
}

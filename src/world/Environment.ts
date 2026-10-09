import * as THREE from 'three';
import { Sky } from '../planet/Sky';
import { Water } from '../planet/Water';
import type { Seabed } from './Seabed';

export const LIGHT_SETTINGS = {
  /** Direction toward the sun (world space; island is at +Y). Low western golden-hour sun. */
  sunDir: new THREE.Vector3(-0.62, 0.62, 0.48).normalize(),
  sunColor: '#FFD8A8',
  sunIntensity: 2.6,
  skyColor: '#CFE8FF',
  groundColor: '#F5C9A0',
  hemiIntensity: 1.35,
  fogDensity: 0.0036,
  shadowSize: 34,
};

/** Sky, water, fog and lights. The sun's shadow camera follows the player. */
export class Environment {
  readonly sky: Sky;
  readonly water: Water;
  readonly sun: THREE.DirectionalLight;
  readonly hemi: THREE.HemisphereLight;

  constructor(scene: THREE.Scene, seabed: Seabed) {
    const L = LIGHT_SETTINGS;
    scene.fog = new THREE.FogExp2(Sky.fogColor(), L.fogDensity);
    scene.background = Sky.fogColor();

    this.sky = new Sky(L.sunDir);
    scene.add(this.sky.mesh);
    this.water = new Water(seabed, L.sunDir);
    scene.add(this.water.mesh);

    this.hemi = new THREE.HemisphereLight(L.skyColor, L.groundColor, L.hemiIntensity);
    scene.add(this.hemi);

    this.sun = new THREE.DirectionalLight(L.sunColor, L.sunIntensity);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    const c = this.sun.shadow.camera;
    c.left = c.bottom = -L.shadowSize;
    c.right = c.top = L.shadowSize;
    c.near = 1;
    c.far = 200;
    this.sun.shadow.bias = -0.0004;
    this.sun.shadow.normalBias = 0.04;
    scene.add(this.sun, this.sun.target);
  }

  update(time: number, focus: THREE.Vector3, camera: THREE.Camera, up: THREE.Vector3): void {
    this.water.update(time);
    this.sky.update(camera, up);
    // shadow box follows the player (snapped to texels to avoid shimmering)
    this.sun.target.position.copy(focus);
    this.sun.position.copy(focus).addScaledVector(LIGHT_SETTINGS.sunDir, 80);
    this.hemi.position.copy(up);
  }
}

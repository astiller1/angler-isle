import * as THREE from 'three';
import { Sky } from '../planet/Sky';
import { Water } from '../planet/Water';
import { DAY, skyKeysAt, sunDirection, type SkyKey } from '../data/daycycle';
import type { Seabed } from './Seabed';
import { QUALITY } from '../core/Quality';

export const LIGHT_SETTINGS = {
  fogDensity: 0.0032,
  shadowSize: 34,
  /** Multiplier on the day-cycle speed (debug). 1 = 24 real minutes per day. */
  timeScale: 1,
  /** Freeze the clock (debug). */
  paused: false,
};

const _a = new THREE.Color();
const _b = new THREE.Color();
const UP = new THREE.Vector3(0, 1, 0); // the island sits at the north pole

function lerpHex(a: string, b: string, t: number, out: THREE.Color): THREE.Color {
  return out.copy(_a.set(a)).lerp(_b.set(b), t);
}
function lerpNum(a: SkyKey, b: SkyKey, k: keyof SkyKey, t: number): number {
  return (a[k] as number) + ((b[k] as number) - (a[k] as number)) * t;
}

/**
 * Sky, water, fog and lights driven by the day–night cycle. The sun orbits the planet (see
 * data/daycycle.ts); the moon is opposite. One directional light follows whichever is up.
 */
export class Environment {
  readonly sky: Sky;
  readonly water: Water;
  readonly sun: THREE.DirectionalLight;
  readonly hemi: THREE.HemisphereLight;
  /** Current game hour 0..24. */
  hour: number;
  /** 0 = full day, 1 = deep night (for other systems, e.g. lanterns, NPCs). */
  night = 0;
  readonly sunDir = new THREE.Vector3();
  readonly moonDir = new THREE.Vector3();
  private fog: THREE.FogExp2;
  private glow: THREE.Points | null = null;
  private lightDir = new THREE.Vector3();

  constructor(
    private scene: THREE.Scene,
    seabed: Seabed,
    startHour = DAY.startHour,
  ) {
    this.hour = startHour;
    this.fog = new THREE.FogExp2(new THREE.Color(), LIGHT_SETTINGS.fogDensity);
    scene.fog = this.fog;
    scene.background = new THREE.Color();

    this.sky = new Sky();
    scene.add(this.sky.mesh);
    this.water = new Water(seabed);
    scene.add(this.water.mesh);

    this.hemi = new THREE.HemisphereLight('#ffffff', '#ffffff', 1);
    scene.add(this.hemi);

    this.sun = new THREE.DirectionalLight('#ffffff', 2);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(QUALITY.shadowMapSize, QUALITY.shadowMapSize);
    const c = this.sun.shadow.camera;
    c.left = c.bottom = -LIGHT_SETTINGS.shadowSize;
    c.right = c.top = LIGHT_SETTINGS.shadowSize;
    c.near = 1;
    c.far = 200;
    this.sun.shadow.bias = -0.0004;
    this.sun.shadow.normalBias = 0.04;
    scene.add(this.sun, this.sun.target);
    this.applyTime();
  }

  /** Warm glowing points at lantern positions (GLOW_* empties), visible at night. */
  setGlows(positions: THREE.Vector3[]): void {
    if (!positions.length) return;
    const g = new THREE.BufferGeometry().setFromPoints(positions);
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const ctx = c.getContext('2d')!;
    const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(255,240,190,1)');
    grad.addColorStop(0.25, 'rgba(255,200,110,0.7)');
    grad.addColorStop(1, 'rgba(255,160,60,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);
    const mat = new THREE.PointsMaterial({
      size: 1.6, map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false,
      blending: THREE.AdditiveBlending, fog: false, opacity: 0,
    });
    this.glow = new THREE.Points(g, mat);
    this.glow.frustumCulled = false;
    this.scene.add(this.glow);
  }

  update(dt: number, time: number, focus: THREE.Vector3, camera: THREE.Camera, up: THREE.Vector3): void {
    if (!LIGHT_SETTINGS.paused) {
      this.hour = (this.hour + (dt * LIGHT_SETTINGS.timeScale) / DAY.realSecondsPerGameHour) % 24;
    }
    this.applyTime();
    this.water.update(time);
    this.sky.update(camera, up, time);
    // shadow box follows the player
    this.sun.target.position.copy(focus);
    this.sun.position.copy(focus).addScaledVector(this.lightDir, 80);
  }

  private applyTime(): void {
    const [a, b, t] = skyKeysAt(this.hour);
    const s = sunDirection(this.hour);
    this.sunDir.set(s[0], s[1], s[2]);
    this.moonDir.copy(this.sunDir).negate();

    const zenith = lerpHex(a.zenith, b.zenith, t, new THREE.Color());
    const horizon = lerpHex(a.horizon, b.horizon, t, new THREE.Color());
    const below = lerpHex(a.below, b.below, t, new THREE.Color());
    const u = this.sky.material.uniforms;
    u.uZenith.value.copy(zenith);
    u.uHorizon.value.copy(horizon);
    u.uBelow.value.copy(below);
    u.uSunDir.value.copy(this.sunDir);
    u.uMoonDir.value.copy(this.moonDir);
    u.uStars.value = lerpNum(a, b, 'stars', t);
    lerpHex(a.sunColor, b.sunColor, t, u.uSun.value);

    // fog / background blend toward the horizon color
    this.fog.color.copy(horizon).lerp(zenith, 0.15);
    (this.scene.background as THREE.Color).copy(this.fog.color);

    // one directional light: the sun by day, the moon by night (faded near their horizons)
    const sunElev = this.sunDir.dot(UP);
    const sunI = lerpNum(a, b, 'sunIntensity', t) * THREE.MathUtils.smoothstep(sunElev, -0.02, 0.12);
    const moonI = lerpNum(a, b, 'moonIntensity', t) * THREE.MathUtils.smoothstep(-sunElev, 0.0, 0.2);
    if (sunI >= moonI) {
      this.lightDir.copy(this.sunDir);
      lerpHex(a.sunColor, b.sunColor, t, this.sun.color);
      this.sun.intensity = sunI;
    } else {
      this.lightDir.copy(this.moonDir);
      this.sun.color.set('#9DB4E6');
      this.sun.intensity = moonI;
    }
    lerpHex(a.ambientSky, b.ambientSky, t, this.hemi.color);
    lerpHex(a.ambientGround, b.ambientGround, t, this.hemi.groundColor);
    this.hemi.intensity = lerpNum(a, b, 'ambientIntensity', t);

    // water
    const w = this.water.material.uniforms;
    w.uSky.value.copy(horizon);
    w.uSunDir.value.copy(this.lightDir);
    w.uSunColor.value.copy(this.sun.color).multiplyScalar(Math.min(1, this.sun.intensity / 2.2) + (sunI < moonI ? 0.4 : 0));
    w.uLight.value = lerpNum(a, b, 'water', t);

    this.night = 1 - lerpNum(a, b, 'water', t);
    if (this.glow) (this.glow.material as THREE.PointsMaterial).opacity = lerpNum(a, b, 'lanterns', t);
  }
}

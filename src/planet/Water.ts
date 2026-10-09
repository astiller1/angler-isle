import * as THREE from 'three';
import { PLANET_RADIUS } from './Planet';
import type { Seabed } from '../world/Seabed';

export const WATER_SETTINGS = {
  shallow: '#7DF0E0',
  mid: '#25C2CF',
  deep: '#1673B5',
  foam: '#FFFFFF',
  waveHeight: 0.12,
  waveSpeed: 1.0,
  foamWidth: 0.55,
};

/**
 * The ocean: one sphere-shaped mesh with polar rings that are dense near the island (north pole) and
 * coarse elsewhere. Color and shoreline foam come from the Seabed height texture.
 */
export class Water {
  readonly mesh: THREE.Mesh;
  readonly material: THREE.ShaderMaterial;

  constructor(seabed: Seabed, sunDir: THREE.Vector3) {
    this.material = new THREE.ShaderMaterial({
      fog: true,
      uniforms: THREE.UniformsUtils.merge([
        THREE.UniformsLib.fog,
        {
          uTime: { value: 0 },
          uR: { value: PLANET_RADIUS },
          uSeabed: { value: null },
          uSeabedHalf: { value: seabed.half },
          uShallow: { value: new THREE.Color(WATER_SETTINGS.shallow) },
          uMid: { value: new THREE.Color(WATER_SETTINGS.mid) },
          uDeep: { value: new THREE.Color(WATER_SETTINGS.deep) },
          uFoam: { value: new THREE.Color(WATER_SETTINGS.foam) },
          uSky: { value: new THREE.Color('#FFD9B8') },
          uSunDir: { value: sunDir.clone() },
          uSunColor: { value: new THREE.Color('#FFE2B0') },
          uWaveH: { value: WATER_SETTINGS.waveHeight },
          uFoamWidth: { value: WATER_SETTINGS.foamWidth },
        },
      ]),
      vertexShader: VERT,
      fragmentShader: FRAG,
    });
    this.material.uniforms.uSeabed.value = seabed.texture;
    this.mesh = new THREE.Mesh(buildGeometry(), this.material);
    this.mesh.receiveShadow = false;
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = -1;
  }

  update(time: number): void {
    this.material.uniforms.uTime.value = time * WATER_SETTINGS.waveSpeed;
  }

  /** CPU version of the wave height (matches the shader) for bobbers/boats. */
  static waveHeight(x: number, z: number, time: number): number {
    return waveH(x, z, time * WATER_SETTINGS.waveSpeed) * WATER_SETTINGS.waveHeight;
  }
}

function waveH(x: number, z: number, t: number): number {
  return (
    Math.sin(x * 0.21 + t * 1.3) * 0.5 +
    Math.sin(z * 0.17 - t * 1.1) * 0.5 +
    Math.sin((x + z) * 0.37 + t * 1.9) * 0.25
  );
}

function buildGeometry(): THREE.BufferGeometry {
  const R = PLANET_RADIUS;
  // ring distances (map meters from the pole) — dense near the island
  const rings: number[] = [];
  for (let d = 0; d < 250; d += 2.5) rings.push(d);
  for (let d = 250; d < 600; d += 10) rings.push(d);
  const maxD = Math.PI * R;
  for (let d = 600; d < maxD; d += 40) rings.push(d);
  rings.push(maxD);
  const seg = 180;
  const pos: number[] = [];
  const idx: number[] = [];
  for (let r = 0; r < rings.length; r++) {
    const th = rings[r] / R;
    for (let s = 0; s <= seg; s++) {
      const ph = (s / seg) * Math.PI * 2;
      pos.push(Math.sin(th) * Math.cos(ph) * R, Math.cos(th) * R, Math.sin(th) * Math.sin(ph) * R);
    }
  }
  const row = seg + 1;
  for (let r = 0; r < rings.length - 1; r++) {
    for (let s = 0; s < seg; s++) {
      const a = r * row + s;
      const b = a + 1;
      const c = a + row;
      const d = c + 1;
      idx.push(a, b, c, b, d, c);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  return g;
}

const VERT = /* glsl */ `
uniform float uTime;
uniform float uR;
uniform float uWaveH;
varying vec2 vMap;
varying vec3 vDir;
varying vec3 vWorld;
#include <fog_pars_vertex>

float waveH(vec2 m, float t) {
  return sin(m.x * 0.21 + t * 1.3) * 0.5 + sin(m.y * 0.17 - t * 1.1) * 0.5 + sin((m.x + m.y) * 0.37 + t * 1.9) * 0.25;
}

void main() {
  vec3 dir = normalize(position);
  float th = acos(clamp(dir.y, -1.0, 1.0));
  float hor = length(dir.xz);
  vec2 m = hor > 1e-6 ? dir.xz / hor * th * uR : vec2(0.0);
  vMap = m;
  vDir = dir;
  float h = waveH(m, uTime) * uWaveH;
  vec3 p = dir * (uR + h);
  vWorld = p;
  vec4 mvPosition = viewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}
`;

const FRAG = /* glsl */ `
uniform float uTime;
uniform sampler2D uSeabed;
uniform float uSeabedHalf;
uniform vec3 uShallow;
uniform vec3 uMid;
uniform vec3 uDeep;
uniform vec3 uFoam;
uniform vec3 uSky;
uniform vec3 uSunDir;
uniform vec3 uSunColor;
uniform float uWaveH;
uniform float uFoamWidth;
varying vec2 vMap;
varying vec3 vDir;
varying vec3 vWorld;
#include <fog_pars_fragment>

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
}

void main() {
  vec2 uv = (vMap + uSeabedHalf) / (2.0 * uSeabedHalf);
  float bed = -20.0;
  if (uv.x > 0.0 && uv.y > 0.0 && uv.x < 1.0 && uv.y < 1.0) bed = texture2D(uSeabed, uv).r;
  float depth = max(-bed, 0.0);

  // analytic-ish normal from layered noise ripples
  float t = uTime;
  vec2 m = vMap;
  float e = 0.4;
  float n0 = noise(m * 0.35 + vec2(t * 0.3, t * 0.2)) + 0.5 * noise(m * 0.9 - vec2(t * 0.4, -t * 0.25));
  float nx = noise((m + vec2(e, 0.0)) * 0.35 + vec2(t * 0.3, t * 0.2)) + 0.5 * noise((m + vec2(e, 0.0)) * 0.9 - vec2(t * 0.4, -t * 0.25));
  float nz = noise((m + vec2(0.0, e)) * 0.35 + vec2(t * 0.3, t * 0.2)) + 0.5 * noise((m + vec2(0.0, e)) * 0.9 - vec2(t * 0.4, -t * 0.25));
  vec3 east = normalize(vec3(1.0, 0.0, 0.0) - vDir * vDir.x);
  vec3 south = normalize(vec3(0.0, 0.0, 1.0) - vDir * vDir.z);
  vec3 N = normalize(vDir - (east * (nx - n0) + south * (nz - n0)) * 0.6);

  // depth colors
  vec3 col = mix(uShallow, uMid, smoothstep(0.2, 2.2, depth));
  col = mix(col, uDeep, smoothstep(2.5, 9.0, depth));

  vec3 V = normalize(cameraPosition - vWorld);
  float fres = pow(1.0 - clamp(dot(N, V), 0.0, 1.0), 4.0);
  col = mix(col, uSky, fres * 0.45);
  vec3 H = normalize(V + uSunDir);
  float spec = pow(max(dot(N, H), 0.0), 140.0);
  col += uSunColor * spec * 0.9;
  col *= 0.88 + 0.22 * max(dot(vDir, uSunDir), 0.0);

  // shoreline foam: solid edge + moving bands
  float fn = noise(m * 0.8 + t * 0.15);
  float edge = 1.0 - smoothstep(0.0, uFoamWidth, depth + (fn - 0.5) * 0.25);
  float bands = smoothstep(0.75, 0.95, sin(depth * 5.0 - t * 1.6 + fn * 2.0)) * (1.0 - smoothstep(0.3, 1.6, depth));
  float foam = clamp(edge + bands * 0.7, 0.0, 1.0) * step(-19.0, bed);
  col = mix(col, uFoam, foam * 0.85);

  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
}
`;

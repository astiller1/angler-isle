import * as THREE from 'three';

export const SKY_SETTINGS = {
  zenith: '#6FB3E8',
  horizon: '#FFD2A6',
  below: '#F7B98E',
  sun: '#FFE6B5',
};

/**
 * Gradient sky dome that follows the camera. The gradient is relative to the camera's local "up"
 * (the planet normal under the player), so the horizon always looks right on the sphere.
 */
export class Sky {
  readonly mesh: THREE.Mesh;
  readonly material: THREE.ShaderMaterial;

  constructor(sunDir: THREE.Vector3) {
    this.material = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      uniforms: {
        uUp: { value: new THREE.Vector3(0, 1, 0) },
        uSunDir: { value: sunDir.clone() },
        uZenith: { value: new THREE.Color(SKY_SETTINGS.zenith) },
        uHorizon: { value: new THREE.Color(SKY_SETTINGS.horizon) },
        uBelow: { value: new THREE.Color(SKY_SETTINGS.below) },
        uSun: { value: new THREE.Color(SKY_SETTINGS.sun) },
      },
      vertexShader: /* glsl */ `
        varying vec3 vDir;
        void main() {
          vDir = normalize(position);
          vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          gl_Position = p.xyww;
        }`,
      fragmentShader: /* glsl */ `
        uniform vec3 uUp; uniform vec3 uSunDir;
        uniform vec3 uZenith; uniform vec3 uHorizon; uniform vec3 uBelow; uniform vec3 uSun;
        varying vec3 vDir;
        void main() {
          vec3 d = normalize(vDir);
          float e = dot(d, uUp);
          vec3 col = mix(uHorizon, uZenith, pow(smoothstep(0.0, 0.75, e), 0.7));
          col = mix(col, uBelow, smoothstep(0.0, -0.35, e));
          float s = max(dot(d, uSunDir), 0.0);
          col += uSun * (pow(s, 8.0) * 0.35 + pow(s, 600.0) * 2.0);
          // warm glow band around the horizon on the sun side
          col += vec3(1.0, 0.55, 0.3) * 0.18 * pow(s, 3.0) * (1.0 - smoothstep(0.0, 0.35, abs(e)));
          gl_FragColor = vec4(col, 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
    });
    this.mesh = new THREE.Mesh(new THREE.SphereGeometry(1000, 32, 16), this.material);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = -10;
  }

  update(camera: THREE.Camera, up: THREE.Vector3): void {
    this.mesh.position.copy(camera.position);
    this.material.uniforms.uUp.value.copy(up);
  }

  /** Color matching the sky horizon, used for fog. */
  static fogColor(): THREE.Color {
    return new THREE.Color(SKY_SETTINGS.horizon);
  }
}

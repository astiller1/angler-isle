import * as THREE from 'three';

/**
 * Gradient sky dome that follows the camera, with sun disc, moon disc and stars. The gradient is
 * relative to the camera's local "up" (the planet normal under the player), so the horizon always
 * looks right on the sphere. Colors are driven by the day cycle (Environment).
 */
export class Sky {
  readonly mesh: THREE.Mesh;
  readonly material: THREE.ShaderMaterial;

  constructor() {
    this.material = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      uniforms: {
        uUp: { value: new THREE.Vector3(0, 1, 0) },
        uSunDir: { value: new THREE.Vector3(0, 1, 0) },
        uMoonDir: { value: new THREE.Vector3(0, -1, 0) },
        uZenith: { value: new THREE.Color() },
        uHorizon: { value: new THREE.Color() },
        uBelow: { value: new THREE.Color() },
        uSun: { value: new THREE.Color('#FFE6B5') },
        uStars: { value: 0 },
        uTime: { value: 0 },
      },
      vertexShader: /* glsl */ `
        varying vec3 vDir;
        void main() {
          vDir = normalize(position);
          vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          gl_Position = p.xyww;
        }`,
      fragmentShader: /* glsl */ `
        uniform vec3 uUp; uniform vec3 uSunDir; uniform vec3 uMoonDir;
        uniform vec3 uZenith; uniform vec3 uHorizon; uniform vec3 uBelow; uniform vec3 uSun;
        uniform float uStars; uniform float uTime;
        varying vec3 vDir;
        float hash(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
        void main() {
          vec3 d = normalize(vDir);
          float e = dot(d, uUp);
          vec3 col = mix(uHorizon, uZenith, pow(smoothstep(0.0, 0.8, e), 0.65));
          col = mix(col, uBelow, smoothstep(0.0, -0.3, e));

          // sun: glow + disc (fades when below the local horizon)
          float sunUp = smoothstep(-0.12, 0.05, dot(uSunDir, uUp));
          float s = max(dot(d, uSunDir), 0.0);
          col += uSun * sunUp * (pow(s, 6.0) * 0.28 + pow(s, 900.0) * 2.5);
          col += vec3(1.0, 0.5, 0.25) * 0.22 * pow(s, 3.0) * sunUp * (1.0 - smoothstep(0.0, 0.4, abs(e)));

          // moon
          float moonUp = smoothstep(-0.1, 0.05, dot(uMoonDir, uUp));
          float m = max(dot(d, uMoonDir), 0.0);
          col += vec3(0.85, 0.9, 1.0) * moonUp * (smoothstep(0.9993, 0.9996, m) * 1.4 + pow(m, 60.0) * 0.12);

          // stars above the horizon
          if (uStars > 0.01 && e > 0.0) {
            vec3 cell = floor(d * 220.0);
            float h = hash(cell);
            float star = step(0.9965, h) * (0.6 + 0.4 * sin(uTime * 2.0 + h * 50.0));
            col += vec3(star) * uStars * smoothstep(0.0, 0.15, e);
          }
          gl_FragColor = vec4(col, 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
    });
    this.mesh = new THREE.Mesh(new THREE.SphereGeometry(1000, 48, 24), this.material);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = -10;
  }

  update(camera: THREE.Camera, up: THREE.Vector3, time: number): void {
    this.mesh.position.copy(camera.position);
    this.material.uniforms.uUp.value.copy(up);
    this.material.uniforms.uTime.value = time;
  }
}

import * as THREE from 'three';
import { toTangent, upAt } from '../planet/Planet';
import type { Collision } from '../world/Collision';

export const CAMERA_SETTINGS = {
  distance: 7.5,
  minDistance: 1.2,
  pivotHeight: 1.25,
  pitch: 0.38,
  minPitch: -0.15,
  maxPitch: 1.25,
  yawSpeed: 2.4,
  pitchSpeed: 1.6,
  mouseSensitivity: 0.005,
  followLerp: 14,
  /** How quickly the camera follows the player's height (1/s) and how far it may lag behind (m). */
  heightLerp: 9,
  maxHeightLag: 0.8,
  fov: 62,
};

/**
 * Third-person orbit camera on a sphere. The orbit reference (`forward`) is kept tangent to the
 * planet under the player every frame (parallel transport), so walking over the curve never flips it.
 */
export class CameraRig {
  readonly camera: THREE.PerspectiveCamera;
  /** Tangent direction the camera looks along (horizontal). Player movement is relative to it. */
  readonly forward = new THREE.Vector3(0, 0, -1);
  readonly right = new THREE.Vector3(1, 0, 0);
  pitch = CAMERA_SETTINGS.pitch;
  private distance = CAMERA_SETTINGS.distance;
  /** Optional override target (e.g. look toward the bobber while fishing). */
  focusBlend = 0;
  readonly focusPoint = new THREE.Vector3();

  private up = new THREE.Vector3();
  private pivot = new THREE.Vector3();
  private desired = new THREE.Vector3();
  private dir = new THREE.Vector3();
  private smoothTarget = new THREE.Vector3();
  private delta = new THREE.Vector3();
  private initialized = false;

  constructor(
    aspect: number,
    private collision: Collision,
  ) {
    this.camera = new THREE.PerspectiveCamera(CAMERA_SETTINGS.fov, aspect, 0.1, 3000);
  }

  /** Point the orbit so the camera looks along `dir` (tangent). */
  setHeading(dir: THREE.Vector3): void {
    this.forward.copy(dir);
  }

  update(target: THREE.Vector3, look: THREE.Vector2, mouse: THREE.Vector2, dt: number): void {
    const S = CAMERA_SETTINGS;
    upAt(target, this.up);
    toTangent(this.forward, this.up);

    const yaw = -look.x * S.yawSpeed * dt - mouse.x * S.mouseSensitivity;
    if (yaw) this.forward.applyAxisAngle(this.up, yaw);
    this.pitch = THREE.MathUtils.clamp(this.pitch + look.y * S.pitchSpeed * dt + mouse.y * S.mouseSensitivity, S.minPitch, S.maxPitch);
    this.right.crossVectors(this.forward, this.up).normalize();

    // follow the target's height smoothly (slopes, steps), its horizontal position exactly
    if (!this.initialized) this.smoothTarget.copy(target);
    const d = this.delta.subVectors(target, this.smoothTarget);
    const dUp = d.dot(this.up);
    const lag = THREE.MathUtils.clamp(dUp * Math.exp(-dt * S.heightLerp), -S.maxHeightLag, S.maxHeightLag);
    this.smoothTarget.copy(target).addScaledVector(this.up, -lag);
    this.pivot.copy(this.smoothTarget).addScaledVector(this.up, S.pivotHeight);
    this.dir.copy(this.forward).multiplyScalar(-Math.cos(this.pitch)).addScaledVector(this.up, Math.sin(this.pitch)).normalize();

    // spring arm: shorten when something is between pivot and camera
    let want = S.distance;
    const hit = this.collision.raycast(this.pivot, this.dir, S.distance + 0.3, true);
    if (hit) want = Math.max(S.minDistance, hit.distance - 0.35);
    this.distance = want < this.distance ? want : THREE.MathUtils.lerp(this.distance, want, 1 - Math.exp(-dt * 4));

    this.desired.copy(this.pivot).addScaledVector(this.dir, this.distance);
    if (!this.initialized) {
      this.camera.position.copy(this.desired);
      this.initialized = true;
    } else {
      this.camera.position.lerp(this.desired, 1 - Math.exp(-dt * S.followLerp));
    }
    this.camera.up.copy(this.up);
    const lookAt = this.desired.copy(this.pivot);
    if (this.focusBlend > 0) lookAt.lerp(this.focusPoint, this.focusBlend * 0.35);
    this.camera.lookAt(lookAt);
  }

  resize(aspect: number): void {
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }
}

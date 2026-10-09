import * as THREE from 'three';
import { EventBus } from './EventBus';
import { Input } from './Input';
import { Assets } from './Assets';

/** Anything that wants a per-frame update. */
export interface System {
  update(dt: number, time: number): void;
}

/** Owns renderer, scene, loop and the shared services every system receives. */
export class Game {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly events = new EventBus();
  readonly input: Input;
  readonly assets = new Assets();
  readonly debug = new URLSearchParams(location.search).has('debug');
  camera!: THREE.PerspectiveCamera;

  private systems: System[] = [];
  private clock = new THREE.Clock();
  private time = 0;
  /** Called after systems update, before rendering. */
  onFrame: ((dt: number) => void) | null = null;

  constructor(readonly canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.toneMapping = THREE.NeutralToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.input = new Input(canvas);
    window.addEventListener('resize', () => this.resize());
  }

  add<T extends System>(s: T): T {
    this.systems.push(s);
    return s;
  }

  resize(): void {
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    if (this.camera) {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
    }
  }

  start(): void {
    this.clock.start();
    this.renderer.setAnimationLoop(() => this.frame());
  }

  private frame(): void {
    const dt = Math.min(this.clock.getDelta(), 1 / 20);
    this.time += dt;
    this.input.update();
    for (const s of this.systems) s.update(dt, this.time);
    this.onFrame?.(dt);
    this.renderer.render(this.scene, this.camera);
    this.input.endFrame();
  }
}

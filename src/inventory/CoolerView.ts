import * as THREE from 'three';
import type { Assets } from '../core/Assets';
import type { GameState } from '../state/GameState';

/**
 * The cooler strapped to the cat's back: one closed box that always looks the same (upgrades only add
 * capacity). It gives a little hop when its contents change — call `refresh()` then.
 */
export class CoolerView {
  readonly root = new THREE.Group();
  private box: THREE.Object3D;
  private bounce = 0;
  private count: number;

  constructor(
    assets: Assets,
    private state: GameState,
  ) {
    this.box = assets.get('props/cooler_small');
    this.box.rotation.y = Math.PI; // straps toward the cat's back
    this.box.position.z = -0.02;
    this.box.traverse((o) => (o.castShadow = true));
    this.root.add(this.box);
    this.count = state.cooler.length;
  }

  refresh(): void {
    if (this.state.cooler.length !== this.count) this.bounce = 1;
    this.count = this.state.cooler.length;
  }

  update(dt: number): void {
    this.bounce = Math.max(0, this.bounce - dt * 2.5);
    const b = Math.sin(this.bounce * Math.PI * 3) * this.bounce;
    this.box.position.y = Math.abs(b) * 0.05;
    this.box.rotation.z = b * 0.12;
  }
}

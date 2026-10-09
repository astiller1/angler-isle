import * as THREE from 'three';
import type { Assets } from '../core/Assets';
import { fishById } from '../data/fish';
import { coolerTier } from '../data/upgrades';
import type { GameState } from '../state/GameState';

/** Displayed fish length inside the cooler (m). */
const FISH_IN_COOLER = 0.36;

/**
 * The cooler strapped to the cat's back, with the caught fish standing tail-up in its SLOT_* anchors.
 * Call `refresh()` whenever the cooler contents change.
 */
export class CoolerView {
  readonly root = new THREE.Group();
  private box: THREE.Object3D;
  private slots: THREE.Object3D[] = [];
  private fishNodes: THREE.Object3D[] = [];
  private wiggle = 0;

  constructor(
    private assets: Assets,
    private state: GameState,
  ) {
    this.box = assets.get(coolerTier(state.coolerTier).model);
    this.box.rotation.y = Math.PI; // straps toward the cat's back
    this.box.position.z = -0.02;
    this.root.add(this.box);
    this.box.traverse((o) => {
      if (o.name.startsWith('SLOT_')) this.slots.push(o);
      o.castShadow = true;
    });
    this.slots.sort((a, b) => a.name.localeCompare(b.name));
    this.refresh();
  }

  refresh(): void {
    for (const n of this.fishNodes) n.parent?.remove(n);
    this.fishNodes = [];
    this.state.cooler.forEach((f, i) => {
      const slot = this.slots[i % Math.max(1, this.slots.length)];
      if (!slot) return;
      const def = fishById(f.fishId);
      const m = this.assets.get(def.model);
      m.scale.setScalar(FISH_IN_COOLER);
      m.rotation.set(Math.PI / 2, (i % 2) * 0.6 - 0.3, 0);
      m.position.y = FISH_IN_COOLER * 0.25;
      slot.add(m);
      this.fishNodes.push(m);
    });
    this.wiggle = 1;
  }

  update(dt: number): void {
    this.wiggle = Math.max(0, this.wiggle - dt * 1.5);
    this.fishNodes.forEach((n, i) => {
      n.rotation.z = Math.sin(performance.now() * 0.02 + i) * 0.25 * this.wiggle;
    });
  }
}

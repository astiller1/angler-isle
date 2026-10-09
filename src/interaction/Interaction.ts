import * as THREE from 'three';
import type { Game } from '../core/Game';
import type { Hud } from '../ui/Hud';
import type { Player } from '../player/Player';

/** Anything the player can walk up to and press "interact" on: neighbors, trader, rod rack, (later) piers & shop. */
export interface Interactable {
  id: string;
  position: THREE.Vector3;
  radius: number;
  label(): string | null;
  interact(): void | Promise<void>;
}

const _d = new THREE.Vector3();

export class InteractionSystem {
  private items: Interactable[] = [];
  current: Interactable | null = null;
  private busy = false;

  constructor(
    private game: Game,
    private player: Player,
    private hud: Hud,
  ) {}

  add(i: Interactable): void {
    this.items.push(i);
  }

  remove(id: string): void {
    this.items = this.items.filter((i) => i.id !== id);
  }

  /** Returns true when an interact prompt is showing (other prompts should yield). */
  update(): boolean {
    this.current = null;
    if (this.busy || this.hud.menu.isOpen || this.player.locked) return false;
    const p = this.player.controller.position;
    const facing = this.player.controller.facing;
    let best = Infinity;
    for (const i of this.items) {
      _d.copy(i.position).sub(p);
      const dist = _d.length();
      if (dist > i.radius) continue;
      // prefer things in front of the cat
      const score = dist - _d.normalize().dot(facing) * 1.2;
      if (score < best && i.label()) {
        best = score;
        this.current = i;
      }
    }
    if (!this.current) return false;
    this.hud.prompt('interact', this.current.label() ?? '');
    if (this.game.input.pressed('interact')) {
      const it = this.current;
      this.busy = true;
      this.hud.prompt(null);
      Promise.resolve(it.interact()).finally(() => (this.busy = false));
    }
    return true;
  }
}

import * as THREE from 'three';
import type { Game } from '../core/Game';
import { DOCKS, dockById, type DockDef } from '../data/boat';
import { T, fmt } from '../data/strings';
import type { InteractionSystem } from '../interaction/Interaction';
import { mapToWorld, rotateLocal, toTangent, upAt, worldToMap } from '../planet/Planet';
import type { Player } from '../player/Player';
import { OnFoot } from '../player/PlayerController';
import type { GameState } from '../state/GameState';
import type { Hud } from '../ui/Hud';
import type { World } from '../world/World';
import { Boat, InBoat } from './Boat';

interface DockInfo {
  def: DockDef;
  /** Where the cat stands on the pier (world). */
  stand: THREE.Vector3;
  /** Mooring pose of the boat (map). */
  moor: { x: number; z: number; yaw: number };
  moorPos: THREE.Vector3;
}

/**
 * Owns the rowboat once bought: mooring at the piers ("Anlegestellen"), boarding and leaving
 * (only at piers), and the save state. Driving itself is the `InBoat` movement mode.
 */
export class BoatSystem {
  readonly docks: DockInfo[];
  boat: Boat | null = null;
  private mode: InBoat | null = null;

  constructor(
    private game: Game,
    private world: World,
    private player: Player,
    private hud: Hud,
    private state: GameState,
    interaction: InteractionSystem,
  ) {
    this.docks = DOCKS.map((def) => this.dockInfo(def));
    for (const d of this.docks) {
      interaction.add({
        id: `board:${d.def.id}`,
        position: d.stand,
        radius: 3.6,
        label: () => (this.boat && !this.aboard ? T.boardBoat : null),
        interact: () => this.board(d),
      });
      interaction.add({
        id: `dock:${d.def.id}`,
        position: d.moorPos,
        radius: 7,
        label: () => (this.aboard ? fmt(T.dockBoat, { dock: d.def.name }) : null),
        interact: () => this.leave(d),
      });
    }
    if (state.boat.owned) this.spawnBoat();
  }

  get aboard(): boolean {
    return !!this.boat?.aboard;
  }

  private dockInfo(def: DockDef): DockInfo {
    const [sx, sz] = rotateLocal(def.stand[0], def.stand[1], def.rot);
    const x = def.x + sx;
    const z = def.z + sz;
    // stand on whatever deck is there (raycast down onto the pier)
    const top = mapToWorld(x, z, def.h + 3);
    const hit = this.world.collision.raycast(top, upAt(top).negate(), 8);
    const stand = hit ? hit.point.clone() : mapToWorld(x, z, def.h);
    const [mx, mz] = rotateLocal(def.moor[0], def.moor[1], def.rot);
    const moor = { x: def.x + mx, z: def.z + mz, yaw: def.rot + def.moor[2] };
    return { def, stand, moor, moorPos: mapToWorld(moor.x, moor.z, 0.3) };
  }

  /** Called after buying the boat (and on load when owned). */
  spawnBoat(): void {
    if (this.boat) return;
    const b = new Boat(this.game.assets, this.world.seabed, this.world.collision);
    b.setMotor(this.state.boat.motor);
    b.onBlocked = (why) => this.hud.toast(why === 'range' ? T.boatTooFar : T.boatAground, 'info');
    this.game.scene.add(b.root);
    this.boat = b;
    this.mode = new InBoat(b);
    const at = this.state.boat.at;
    if (at) {
      b.place(at.x, at.z, at.yaw);
      this.enter();
    } else this.moorAt(this.dock(this.state.boat.dock));
  }

  setMotor(on: boolean): void {
    this.boat?.setMotor(on);
  }

  private dock(id: string): DockInfo {
    return this.docks.find((d) => d.def.id === id) ?? this.docks.find((d) => d.def.id === dockById(id).id)!;
  }

  private moorAt(d: DockInfo): void {
    this.boat!.place(d.moor.x, d.moor.z, d.moor.yaw);
    this.state.boat.dock = d.def.id;
  }

  /** Step into the boat at a pier (if it is moored elsewhere, it gets brought over). */
  board(d: DockInfo): void {
    if (!this.boat || this.aboard) return;
    if (this.state.boat.dock !== d.def.id) {
      this.moorAt(d);
      this.hud.toast(T.boatBrought, 'info');
    }
    this.enter();
  }

  private enter(): void {
    const b = this.boat!;
    b.aboard = true;
    this.player.controller.mode = this.mode!;
    this.player.controller.velocity.set(0, 0, 0);
    b.seatPosition(this.player.controller.position);
    const fwd = toTangent(b.forward(), upAt(this.player.controller.position));
    this.player.controller.facing.copy(fwd);
    this.player.rig.setHeading(fwd.clone());
    this.syncState();
  }

  /** Leave the boat at a pier: the boat is moored, the cat steps onto the deck. */
  leave(d: DockInfo): void {
    if (!this.boat || !this.aboard) return;
    this.boat.aboard = false;
    this.moorAt(d);
    this.state.boat.at = null;
    const c = this.player.controller;
    c.mode = new OnFoot();
    // face along the pier toward the shore
    const toShore = mapToWorld(d.def.x, d.def.z, d.def.h).sub(d.stand);
    c.teleport(d.stand.clone().addScaledVector(upAt(d.stand), 0.15), toShore);
    this.player.rig.setHeading(toTangent(toShore.clone(), c.up));
    this.hud.toast(fmt(T.boatDocked, { dock: d.def.name }), 'info');
  }

  /** Menu "back to the harbor": leave the boat at the harbor pier. */
  leaveAtHarbor(): void {
    this.leave(this.dock('hafen'));
  }

  /** Keep the save in sync (called before persisting). */
  syncState(): void {
    const b = this.boat;
    if (!b) return;
    this.state.boat.at = b.aboard ? { x: b.x, z: b.z, yaw: b.yaw } : null;
  }

  /** Map position of the boat (for the map), or null. */
  position(): { x: number; z: number; yaw: number } | null {
    return this.boat ? { x: this.boat.x, z: this.boat.z, yaw: this.boat.yaw } : null;
  }

  update(dt: number): void {
    // while aboard the InBoat mode drives & animates the boat; moored it just bobs
    if (this.boat && !this.aboard) this.boat.updateVisual(dt);
  }

  /** Is the player close to land and slow enough to cast (from the boat)? */
  get canFish(): boolean {
    return !this.aboard || Math.abs(this.boat!.speed) < 1.2;
  }

  /** Map coordinates of the cat (on foot or aboard). */
  playerMap(): { x: number; z: number } {
    return worldToMap(this.player.controller.position);
  }
}

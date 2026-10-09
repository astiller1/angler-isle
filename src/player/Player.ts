import * as THREE from 'three';
import type { Game } from '../core/Game';
import type { World } from '../world/World';
import { CameraRig } from './CameraRig';
import { Character, type Pose } from './Character';
import { PlayerController } from './PlayerController';
import { CoolerView } from '../inventory/CoolerView';
import type { GameState } from '../state/GameState';
import { toTangent } from '../planet/Planet';

/**
 * The player: physics body + cat model + camera + carried items (rod, cooler).
 * Other systems (fishing, menus) can lock movement and override the pose.
 */
export class Player {
  readonly controller: PlayerController;
  readonly rig: CameraRig;
  readonly cat: Character;
  readonly cooler: CoolerView;
  rod: THREE.Object3D | null = null;
  /** When set, replaces locomotion poses (fishing, talking…). */
  poseOverride: Pose | null = null;
  /** Number of systems currently requesting a movement lock. */
  private locks = new Set<string>();
  private wish = new THREE.Vector3();

  constructor(
    private game: Game,
    world: World,
    state: GameState,
  ) {
    this.controller = new PlayerController(world.collision, world.seabed);
    this.rig = new CameraRig(innerWidth / innerHeight, world.collision);
    game.camera = this.rig.camera;
    this.cat = new Character(game.assets.get('characters/cat'));
    this.cat.root.traverse((o) => (o.castShadow = true));
    game.scene.add(this.cat.root);
    this.cooler = new CoolerView(game.assets, state);
    const back = this.cat.anchor('ANCHOR_back');
    back?.add(this.cooler.root);
  }

  lock(reason: string, on: boolean): void {
    if (on) this.locks.add(reason);
    else this.locks.delete(reason);
  }

  get locked(): boolean {
    return this.locks.size > 0;
  }

  /** Attach a rod model to the right paw. */
  giveRod(rod: THREE.Object3D): void {
    this.rod = rod;
    rod.rotation.set(THREE.MathUtils.degToRad(50), 0, 0);
    rod.position.set(0, 0.0, 0.02);
    rod.traverse((o) => (o.castShadow = true));
    this.cat.anchor('ANCHOR_hand_R')?.add(rod);
  }

  rodTip(out = new THREE.Vector3()): THREE.Vector3 {
    const tip = this.rod ? this.rod.getObjectByName('ANCHOR_tip') : null;
    return tip ? tip.getWorldPosition(out) : out.copy(this.controller.position).addScaledVector(this.controller.up, 1.6);
  }

  update(dt: number): void {
    const inp = this.game.input;
    const c = this.controller;
    this.wish.set(0, 0, 0).addScaledVector(this.rig.forward, inp.move.y).addScaledVector(this.rig.right, inp.move.x);
    if (this.locked) {
      // allow turning in place (aiming the cast) while locked
      if (this.wish.lengthSq() > 0.04) c.faceToward(toTangent(this.wish.clone(), c.up), dt, 6);
      this.wish.set(0, 0, 0);
    }
    c.update({ dir: this.wish, sprint: inp.held('sprint'), jump: !this.locked && inp.pressed('jump') }, dt);

    this.cat.root.position.copy(c.position);
    this.cat.root.quaternion.copy(c.quaternion);
    this.cat.speed = c.speed;
    if (this.poseOverride) this.cat.pose = this.poseOverride;
    else if (c.inWater && c.speed > 0.3 && c.position.length() - 600 < -0.3) this.cat.pose = 'swim';
    else if (!c.grounded && !c.inWater) this.cat.pose = 'jump';
    else if (c.speed > 5.2) this.cat.pose = 'run';
    else if (c.speed > 0.4) this.cat.pose = 'walk';
    else this.cat.pose = 'idle';
    this.cat.update(dt);
    this.cooler.update(dt);

    this.rig.update(c.position, inp.look, inp.mouseDelta, dt);
  }
}

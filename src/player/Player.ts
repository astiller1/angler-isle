import * as THREE from 'three';
import type { Game } from '../core/Game';
import type { World } from '../world/World';
import { CameraRig } from './CameraRig';
import { Character, type Pose } from './Character';
import { PlayerController } from './PlayerController';
import { CoolerView } from '../inventory/CoolerView';
import type { GameState } from '../state/GameState';
import { heightOf, toTangent } from '../planet/Planet';

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
  /** Seconds since the player last turned the camera manually. */
  private sinceLook = 0;
  /** Last spot on open, dry ground (for rescues). */
  readonly safe = new THREE.Vector3();
  private hasSafe = false;
  private safeTimer = 0;
  private stuckTime = 0;
  private stuckFrom = new THREE.Vector3();
  /** Called when the player had to be rescued (e.g. stuck in the water under a jetty). */
  onRescue: (() => void) | null = null;

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
    this.rod?.parent?.remove(this.rod);
    this.rod = rod;
    rod.rotation.set(THREE.MathUtils.degToRad(50), 0, 0);
    rod.position.set(0, 0.0, 0.02);
    rod.traverse((o) => (o.castShadow = true));
    this.cat.anchor('ANCHOR_hand_R')?.add(rod);
  }

  /** Put the cat somewhere (e.g. back to the harbor) and reset the camera behind it. */
  placeAt(pos: THREE.Vector3): void {
    const c = this.controller;
    c.teleport(pos.clone().addScaledVector(pos.clone().normalize(), 0.3), c.facing.clone());
    this.rig.setHeading(c.facing.clone());
    this.stuckTime = 0;
  }

  /**
   * Remembers the last safe spot on dry, open ground and rescues the cat when it is stuck in the water
   * (moving but not getting anywhere for a while) — e.g. trapped between jetty stilts.
   */
  private watchStuck(dt: number): void {
    const c = this.controller;
    const inp = this.game.input;
    if (c.mode.id === 'inBoat') {
      this.stuckTime = 0;
      return;
    }
    this.safeTimer -= dt;
    if (this.safeTimer <= 0 && c.grounded && !c.inWater) {
      this.safeTimer = 0.5;
      const head = c.position.clone().addScaledVector(c.up, 1.2);
      if (!c.collision.raycast(head, c.up, 4)) {
        this.safe.copy(c.position);
        this.hasSafe = true;
      }
    }
    const trying = !this.locked && inp.move.lengthSq() > 0.25;
    if (!trying || !c.inWater) {
      this.stuckTime = 0;
      return;
    }
    if (this.stuckTime === 0) this.stuckFrom.copy(c.position);
    this.stuckTime += dt;
    if (this.stuckTime > 2.5) {
      if (c.position.distanceTo(this.stuckFrom) < 1.2 && this.hasSafe) {
        this.placeAt(this.safe);
        this.onRescue?.();
      }
      this.stuckTime = 0;
    }
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

    this.watchStuck(dt);
    this.cat.root.position.copy(c.position);
    const inBoat = c.mode.id === 'inBoat';
    // in the boat the cat sits on the thwart; for casting it stands up on the floor boards
    if (inBoat && this.poseOverride) this.cat.root.position.addScaledVector(c.up, -0.3);
    this.cat.root.quaternion.copy(c.quaternion);
    this.cat.speed = c.speed;
    if (this.poseOverride) this.cat.pose = this.poseOverride;
    else if (inBoat) this.cat.pose = 'sit';
    else if (c.inWater && heightOf(c.position) < -0.3) this.cat.pose = 'swim';
    else if (!c.grounded && !c.inWater) this.cat.pose = 'jump';
    else if (c.speed > 5.2) this.cat.pose = 'run';
    else if (c.speed > 0.4) this.cat.pose = 'walk';
    else this.cat.pose = 'idle';
    this.cat.update(dt);
    this.cooler.update(dt);

    // gentle auto-follow: ease the camera behind the cat while walking, unless the player steers it
    const manual = inp.look.lengthSq() > 0.001 || inp.mouseDelta.lengthSq() > 0;
    this.sinceLook = manual ? 0 : this.sinceLook + dt;
    if (!this.locked && this.sinceLook > 1.0 && c.speed > 1.5 && c.facing.dot(this.rig.forward) > -0.2) {
      this.rig.forward.lerp(c.facing, 1 - Math.exp(-dt * 1.1));
    }
    this.rig.update(c.position, inp.look, inp.mouseDelta, dt);
  }
}

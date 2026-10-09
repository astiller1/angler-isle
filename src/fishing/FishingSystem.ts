import * as THREE from 'three';
import type { Game } from '../core/Game';
import { FISH, fishById } from '../data/fish';
import { fishValue } from '../data/economy';
import { SPOTS } from '../data/spots';
import { T, fmt, kg } from '../data/strings';
import type { SpotDef } from '../data/types';
import { rodTier } from '../data/upgrades';
import { addToCooler, coolerFull, newUid, removeFromCooler } from '../inventory/Cooler';
import { mapToWorld, orientationAt, toTangent, worldToMap } from '../planet/Planet';
import { Water } from '../planet/Water';
import type { Player } from '../player/Player';
import type { CaughtFish, GameState } from '../state/GameState';
import type { Hud } from '../ui/Hud';
import type { Seabed } from '../world/Seabed';
import { FISHING, castDistance, rollBiteDelay, rollFish, startFight, stepFight, type Fight } from './logic';

type Phase = 'idle' | 'charging' | 'flying' | 'waiting' | 'bite' | 'reeling' | 'retrieve' | 'landing';

const LINE_POINTS = 24;

/** Turns the pure fishing rules into input, animation, bobber/line visuals and HUD. */
export class FishingSystem {
  phase: Phase = 'idle';
  private power = 0;
  private t = 0;
  private castFrom = new THREE.Vector3();
  private target = { x: 0, z: 0 };
  private castDist = 10;
  private overWater = false;
  private spot: SpotDef | null = null;
  private biteAt = 0;
  private nibbleTimes: number[] = [];
  private pending: { fishId: string; weight: number } | null = null;
  private fight: Fight | null = null;
  private landed: CaughtFish | null = null;
  private heldFish: THREE.Object3D | null = null;
  private bobber: THREE.Object3D;
  private bobberPos = new THREE.Vector3();
  private dip = 0;
  private line: THREE.Line;
  private linePos: Float32Array;
  private rings: { mesh: THREE.Mesh; t: number }[] = [];
  private jumper: { obj: THREE.Object3D; t: number; x: number; z: number; yaw: number } | null = null;
  private waterAheadCheck = 0;
  private waterAhead = false;
  private nearSpot: SpotDef | null = null;
  private rng = Math.random;
  private tmp = new THREE.Vector3();
  private time = 0;

  constructor(
    private game: Game,
    private player: Player,
    private hud: Hud,
    private state: GameState,
    private seabed: Seabed,
  ) {
    this.bobber = game.assets.get('props/bobber');
    this.bobber.scale.setScalar(2.6);
    this.bobber.visible = false;
    game.scene.add(this.bobber);
    this.linePos = new Float32Array(LINE_POINTS * 3);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.linePos, 3));
    this.line = new THREE.Line(g, new THREE.LineBasicMaterial({ color: '#fdf6e3', transparent: true, opacity: 0.9 }));
    this.line.frustumCulled = false;
    this.line.visible = false;
    game.scene.add(this.line);
    const ringGeo = new THREE.RingGeometry(0.35, 0.5, 24).rotateX(-Math.PI / 2);
    for (let i = 0; i < 8; i++) {
      const mesh = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0, depthWrite: false }));
      mesh.visible = false;
      game.scene.add(mesh);
      this.rings.push({ mesh, t: 1 });
    }
  }

  get busy(): boolean {
    return this.phase !== 'idle';
  }

  private get rod() {
    return rodTier(this.state.rodTier);
  }

  /** `promptFree` = no other system is showing a prompt this frame. */
  update(dt: number, time: number, promptFree: boolean): void {
    this.time = time;
    const inp = this.game.input;
    const menuOpen = this.hud.menu.isOpen;
    this.t += dt;
    this.updateRings(dt);
    this.updateJumper(dt);
    this.updateNearSpot(dt);

    switch (this.phase) {
      case 'idle': {
        if (menuOpen || !promptFree) break;
        const canFish = this.state.hasRod && this.player.controller.grounded && !this.player.locked;
        if (canFish && this.waterAhead) this.hud.prompt('fish', T.cast);
        else this.hud.prompt(null);
        if (inp.pressed('fish') && !this.player.locked) {
          if (!this.state.hasRod) this.hud.toast(T.noRod, 'warn');
          else if (this.player.controller.grounded) this.beginCharge();
        }
        break;
      }
      case 'charging': {
        this.power = Math.min(1, this.power + dt / FISHING.chargeTime);
        this.hud.power(this.power);
        if (inp.pressed('cancel')) this.reset();
        else if (!inp.held('fish')) this.release();
        break;
      }
      case 'flying': {
        const dur = 0.55 + this.castDist * 0.025;
        const u = Math.min(1, this.t / dur);
        this.player.cat.poseT = this.t;
        this.flyBobber(u);
        if (u >= 1) this.onLanded();
        break;
      }
      case 'waiting': {
        this.floatBobber(dt);
        if (this.spot && this.t >= this.biteAt) this.onBite();
        else if (this.nibbleTimes.length && this.t >= this.nibbleTimes[0]) {
          this.nibbleTimes.shift();
          this.dip = 0.12;
          this.ring(this.bobberPos, 0.6);
        }
        if (inp.pressed('cancel') || inp.pressed('fish')) this.startRetrieve();
        this.hud.prompt('cancel', T.cancelFishing);
        break;
      }
      case 'bite': {
        this.dip = 0.22 + Math.sin(this.t * 40) * 0.05;
        this.floatBobber(dt);
        const win = this.pending && fishById(this.pending.fishId).rarity === 'rare' ? FISHING.rareBiteWindow : FISHING.biteWindow;
        this.hud.prompt('fish', T.hook);
        if (inp.pressed('fish')) this.hook();
        else if (this.t > win) {
          this.hud.bite(false);
          this.hud.toast(T.missed, 'warn');
          this.game.events.emit('fish:escaped', { fishId: this.pending?.fishId ?? null, reason: 'missed' });
          this.scheduleBite();
          this.phase = 'waiting';
        } else if (inp.pressed('cancel')) this.startRetrieve();
        break;
      }
      case 'reeling':
        this.updateReel(dt);
        break;
      case 'retrieve': {
        const u = Math.min(1, this.t / 0.45);
        const tip = this.player.rodTip(this.tmp);
        this.bobberPos.lerp(tip, u * 0.5);
        this.bobber.position.copy(this.bobberPos);
        this.drawLine(0.2);
        if (u >= 1) this.reset();
        break;
      }
      case 'landing':
        if (this.t > 0.6 && (inp.pressed('confirm') || inp.pressed('fish') || inp.pressed('interact') || this.t > 3.2)) this.finishLanding();
        break;
    }

    if (this.line.visible && this.phase !== 'retrieve' && this.phase !== 'flying') this.drawLine(this.phase === 'reeling' ? 0.05 : 0.35);
    // camera glances at the bobber while fishing
    const rig = this.player.rig;
    const focusOn = this.phase === 'waiting' || this.phase === 'bite' || this.phase === 'reeling';
    rig.focusBlend += ((focusOn ? 1 : 0) - rig.focusBlend) * Math.min(1, dt * 3);
    rig.focusPoint.copy(this.bobberPos);
  }

  // ------------------------------------------------------------------ phases

  private beginCharge(): void {
    this.phase = 'charging';
    this.power = 0;
    this.t = 0;
    this.player.lock('fishing', true);
    this.player.poseOverride = 'charge';
  }

  private release(): void {
    this.hud.power(null);
    const c = this.player.controller;
    this.castDist = castDistance(this.power, this.rod);
    const m = worldToMap(c.position);
    // facing → map direction (local tangent frame ≈ map axes near the island)
    const f = toTangent(this.tmp.copy(c.facing), c.up);
    const east = new THREE.Vector3(1, 0, 0).addScaledVector(c.up, -c.up.x).normalize();
    const south = new THREE.Vector3(0, 0, 1).addScaledVector(c.up, -c.up.z).normalize();
    const dx = f.dot(east);
    const dz = f.dot(south);
    const len = Math.hypot(dx, dz) || 1;
    this.target.x = m.x + (dx / len) * this.castDist;
    this.target.z = m.z + (dz / len) * this.castDist;
    this.overWater = this.seabed.isWater(this.target.x, this.target.z, 0.25);
    this.player.rodTip(this.castFrom);
    this.phase = 'flying';
    this.t = 0;
    this.player.poseOverride = 'cast';
    this.player.cat.poseT = 0;
    this.bobber.visible = true;
    this.line.visible = true;
  }

  private flyBobber(u: number): void {
    const end = mapToWorld(this.target.x, this.target.z, this.overWater ? Water.waveHeight(this.target.x, this.target.z, this.time) : this.seabed.height(this.target.x, this.target.z) + 0.05);
    this.bobberPos.lerpVectors(this.castFrom, end, u);
    const up = this.tmp.copy(this.bobberPos).normalize();
    this.bobberPos.addScaledVector(up, Math.sin(u * Math.PI) * (2 + this.castDist * 0.25));
    this.bobber.position.copy(this.bobberPos);
    this.drawLine(0.05, u);
  }

  private onLanded(): void {
    this.t = 0;
    this.player.poseOverride = 'fishing';
    if (!this.overWater) {
      this.hud.toast(T.notWater, 'warn');
      this.startRetrieve();
      return;
    }
    this.ring(this.bobberPos, 1.2);
    this.ring(this.bobberPos, 0.6);
    const spot = SPOTS.find((s) => s.access === 'shore' && Math.hypot(this.target.x - s.x, this.target.z - s.z) <= s.radius) ?? null;
    this.spot = spot;
    if (!spot) this.hud.toast(T.noFishHere, 'info');
    this.scheduleBite();
    this.phase = 'waiting';
  }

  private scheduleBite(): void {
    this.t = 0;
    this.pending = null;
    this.nibbleTimes = [];
    if (!this.spot) return;
    this.biteAt = rollBiteDelay(this.spot, this.rng);
    const n = FISHING.nibbles[0] + Math.floor(this.rng() * (FISHING.nibbles[1] - FISHING.nibbles[0] + 1));
    for (let i = 0; i < n; i++) this.nibbleTimes.push(this.biteAt * (0.35 + 0.55 * (i + 1) / (n + 1)));
  }

  private onBite(): void {
    const { fish, weight } = rollFish(this.spot!, fishById, this.rng);
    this.pending = { fishId: fish.id, weight };
    this.phase = 'bite';
    this.t = 0;
    this.hud.bite(true);
    this.ring(this.bobberPos, 1.0);
  }

  private hook(): void {
    this.hud.bite(false);
    const fish = fishById(this.pending!.fishId);
    this.fight = startFight(fish, this.pending!.weight, this.rod, this.rng);
    this.phase = 'reeling';
    this.t = 0;
    this.ring(this.bobberPos, 1.4);
  }

  private updateReel(dt: number): void {
    const f = this.fight!;
    const reeling = this.game.input.held('fish');
    const wasBurst = f.burstLeft > 0;
    const res = stepFight(f, reeling, this.rod, dt, this.rng);
    if (!wasBurst && f.burstLeft > 0) {
      this.ring(this.bobberPos, 1.3);
      if (f.fish.fight.burst > 0.5 && this.rng() < 0.6) this.jump(f);
    }
    this.player.poseOverride = reeling ? 'reel' : 'fishing';
    // bobber follows the fish toward the shore point under the rod tip
    const c = this.player.controller;
    const me = worldToMap(c.position);
    const x = me.x + (this.target.x - me.x) * Math.max(0.08, f.distance);
    const z = me.z + (this.target.z - me.z) * Math.max(0.08, f.distance);
    const wob = Math.sin(this.t * 6) * 0.6 * (f.burstLeft > 0 ? 1.6 : 0.5);
    const side = new THREE.Vector2(-(this.target.z - me.z), this.target.x - me.x).normalize().multiplyScalar(wob);
    this.bobberPos.copy(mapToWorld(x + side.x, z + side.y, Water.waveHeight(x, z, this.time) - 0.06));
    this.bobber.position.copy(this.bobberPos);
    if (this.rng() < dt * 3) this.ring(this.bobberPos, 0.5);
    const limit = this.rod.tensionLimit;
    this.hud.tension({
      tension: f.tension,
      limit,
      distance: Math.max(0, f.distance),
      label: f.tension > limit * FISHING.dangerFrom ? '⚠ Zu viel Spannung — loslassen!' : reeling ? 'Einholen…' : `${this.hudKey()} halten zum Einholen`,
    });
    this.hud.prompt(null);
    if (res === 'landed') this.onFightLanded(f);
    else if (res === 'snap' || res === 'slack') {
      this.hud.toast(res === 'snap' ? T.snapped : T.slack, 'warn');
      this.game.events.emit('fish:escaped', { fishId: f.fish.id, reason: res });
      this.hud.tension(null);
      this.reset();
    }
  }

  private hudKey(): string {
    return this.game.input.device === 'gamepad' ? 'RT' : 'F';
  }

  private onFightLanded(f: Fight): void {
    this.hud.tension(null);
    this.line.visible = false;
    this.bobber.visible = false;
    const def = f.fish;
    const fish: CaughtFish = { uid: newUid(), fishId: def.id, weight: f.weight, value: fishValue(def.basePrice, f.weight, def.weight) };
    const isNew = !this.state.log[def.id];
    const log = (this.state.log[def.id] ??= { count: 0, best: 0 });
    log.count++;
    log.best = Math.max(log.best, f.weight);
    this.landed = fish;
    // show the fish held up
    const m = this.game.assets.get(def.model);
    const wt = (f.weight - def.weight[0]) / Math.max(0.01, def.weight[1] - def.weight[0]);
    m.scale.setScalar(def.length * (0.85 + 0.3 * wt));
    m.rotation.set(0, Math.PI / 2, 0);
    m.position.set(0, 1.25, 0.32);
    this.player.cat.root.add(m);
    this.heldFish = m;
    this.player.poseOverride = 'hold';
    this.hud.catchCard(fish, isNew);
    if (def.rarity === 'rare') this.hud.toast(T.rare, 'good');
    this.phase = 'landing';
    this.t = 0;
  }

  private async finishLanding(): Promise<void> {
    const fish = this.landed!;
    this.hud.catchCard(null);
    this.phase = 'idle'; // keep locked until resolved below
    this.player.poseOverride = 'hold';
    if (!coolerFull(this.state)) {
      addToCooler(this.state, fish);
    } else {
      const options = [
        { label: fmt(T.releaseNew, { fish: fishById(fish.fishId).name }) },
        ...this.state.cooler.map((c) => ({ label: fmt(T.releaseOld, { fish: fishById(c.fishId).name, weight: kg(c.weight) }), hint: `${c.value} ●` })),
      ];
      const choice = await this.hud.menu.open({ title: T.coolerFullTitle, text: T.coolerFullText, image: this.hud.icon(fish.fishId), options, backIndex: 0 });
      if (choice === 0) this.game.events.emit('fish:released', { fish });
      else {
        const old = this.state.cooler[choice - 1];
        removeFromCooler(this.state, old.uid);
        this.game.events.emit('fish:released', { fish: old });
        addToCooler(this.state, fish);
      }
    }
    this.game.events.emit('fish:caught', { fish, spotId: this.spot?.id ?? '' });
    this.game.events.emit('cooler:changed');
    this.player.cooler.refresh();
    this.landed = null;
    this.reset();
  }

  private startRetrieve(): void {
    this.phase = 'retrieve';
    this.t = 0;
    this.hud.bite(false);
    this.hud.prompt(null);
  }

  /** Back to idle and release everything. */
  reset(): void {
    this.phase = 'idle';
    this.hud.power(null);
    this.hud.bite(false);
    this.hud.tension(null);
    this.hud.prompt(null);
    this.bobber.visible = false;
    this.line.visible = false;
    this.fight = null;
    this.pending = null;
    if (this.heldFish) {
      this.heldFish.parent?.remove(this.heldFish);
      this.heldFish = null;
    }
    this.player.poseOverride = null;
    this.player.lock('fishing', false);
  }

  // ------------------------------------------------------------------ visuals

  private floatBobber(dt: number): void {
    this.dip = Math.max(0, this.dip - dt * 0.5);
    const h = Water.waveHeight(this.target.x, this.target.z, this.time) - this.dip;
    mapToWorld(this.target.x, this.target.z, h, this.bobberPos);
    this.bobber.position.copy(this.bobberPos);
    orientationAt(this.target.x, this.target.z, 0, this.bobber.quaternion);
    this.bobber.rotateZ(Math.sin(this.time * 2.1) * 0.12);
  }

  private drawLine(sag: number, upTo = 1): void {
    const a = this.player.rodTip(new THREE.Vector3());
    const b = this.bobberPos;
    const up = a.clone().normalize();
    const dist = a.distanceTo(b);
    for (let i = 0; i < LINE_POINTS; i++) {
      const u = (i / (LINE_POINTS - 1)) * upTo;
      const p = this.tmp.lerpVectors(a, b, u).addScaledVector(up, -Math.sin(u * Math.PI) * sag * dist * 0.25);
      this.linePos.set([p.x, p.y, p.z], i * 3);
    }
    this.line.geometry.attributes.position.needsUpdate = true;
  }

  private ring(at: THREE.Vector3, size: number): void {
    const r = this.rings.find((x) => x.t >= 1) ?? this.rings[0];
    r.t = 0;
    r.mesh.visible = true;
    r.mesh.position.copy(at);
    const m = worldToMap(at);
    orientationAt(m.x, m.z, 0, r.mesh.quaternion);
    r.mesh.userData.size = size;
  }

  private updateRings(dt: number): void {
    for (const r of this.rings) {
      if (r.t >= 1) continue;
      r.t = Math.min(1, r.t + dt * 1.2);
      const s = (r.mesh.userData.size as number) * (0.4 + r.t * 2.2);
      r.mesh.scale.set(s, 1, s);
      (r.mesh.material as THREE.MeshBasicMaterial).opacity = (1 - r.t) * 0.8;
      if (r.t >= 1) r.mesh.visible = false;
    }
  }

  private jump(f: Fight): void {
    if (this.jumper) return;
    const obj = this.game.assets.get(f.fish.model);
    obj.scale.setScalar(f.fish.length);
    this.game.scene.add(obj);
    const m = worldToMap(this.bobberPos);
    this.jumper = { obj, t: 0, x: m.x, z: m.z, yaw: this.rng() * 360 };
  }

  private updateJumper(dt: number): void {
    const j = this.jumper;
    if (!j) return;
    j.t += dt / 0.9;
    const h = Math.sin(Math.min(1, j.t) * Math.PI) * 1.6 - 0.2;
    mapToWorld(j.x, j.z, h, j.obj.position);
    orientationAt(j.x, j.z, j.yaw, j.obj.quaternion);
    j.obj.rotateX((j.t - 0.5) * 1.8);
    if (j.t >= 1) {
      this.ring(j.obj.position, 1.2);
      j.obj.parent?.remove(j.obj);
      this.jumper = null;
    }
  }

  private updateNearSpot(dt: number): void {
    this.waterAheadCheck -= dt;
    if (this.waterAheadCheck > 0) return;
    this.waterAheadCheck = 0.2;
    const c = this.player.controller;
    const m = worldToMap(c.position);
    const f = this.tmp.copy(c.facing);
    const dx = f.x;
    const dz = f.z;
    const len = Math.hypot(dx, dz) || 1;
    this.waterAhead = false;
    for (let d = 5; d <= this.rod.castMax; d += 2.5) {
      if (this.seabed.isWater(m.x + (dx / len) * d, m.z + (dz / len) * d, 0.3)) {
        this.waterAhead = true;
        break;
      }
    }
    const near = SPOTS.find((s) => s.access === 'shore' && Math.hypot(m.x - s.x, m.z - s.z) < s.radius + this.rod.castMax + 2) ?? null;
    if (near !== this.nearSpot) {
      this.nearSpot = near;
      this.hud.spotName(near ? near.name : null);
    }
  }
}

export const FISH_COUNT = FISH.length;

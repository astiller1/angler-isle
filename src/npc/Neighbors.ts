import * as THREE from 'three';
import type { Game } from '../core/Game';
import { FISH, fishById } from '../data/fish';
import { NEIGHBORS, TRADER } from '../data/neighbors';
import { SPOTS } from '../data/spots';
import { T, fmt, kg } from '../data/strings';
import type { Anchor, NeighborDef } from '../data/types';
import { sellFish } from '../economy/trader';
import type { Interactable, InteractionSystem } from '../interaction/Interaction';
import { lookOrientation, mapToWorld, orientationAt, toTangent, upAt } from '../planet/Planet';
import { Character, type Pose } from '../player/Character';
import type { Player } from '../player/Player';
import type { GameState } from '../state/GameState';
import type { Hud } from '../ui/Hud';
import type { World } from '../world/World';
import { deliver, matchingFish, reservedFish, startRound, type RequestContext } from './requests';

/** Per-character display scale (models are authored roughly the same size). */
const SCALE: Record<string, number> = { walter: 1.2, bruno: 1.4, fritzi: 1.0, pelle: 1.3, rocco: 1.2 };
/** Standing on a little box behind a counter (m). */
const LIFT: Record<string, number> = { bruno: 0.15, pelle: 0.45, rocco: 0.3 };

export interface Npc {
  id: string;
  name: string;
  char: Character;
  basePose: Pose;
  tag: HTMLDivElement;
  head: THREE.Object3D;
  pos: THREE.Vector3;
  baseQuat: THREE.Quaternion;
  standing: boolean;
  talking: boolean;
  celebrateUntil: number;
}

const pick = <T,>(a: readonly T[]) => a[Math.floor(Math.random() * a.length)];

/** Neighbors (requests, rounds), the fish trader and their name tags / wish bubbles. */
export class Neighbors {
  private npcs: Npc[] = [];
  readonly ctx: RequestContext;
  private tagLayer: HTMLDivElement;
  private v = new THREE.Vector3();
  private time = 0;

  constructor(
    private game: Game,
    private world: World,
    private player: Player,
    private hud: Hud,
    private state: GameState,
    interaction: InteractionSystem,
  ) {
    this.ctx = {
      neighbors: NEIGHBORS,
      fish: FISH,
      spots: SPOTS,
      get hasBoat() {
        return state.boat.owned;
      },
      rng: Math.random,
    };
    this.tagLayer = document.createElement('div');
    hud.root.appendChild(this.tagLayer);

    for (const n of NEIGHBORS) {
      const npc = this.spawn(n.id, n.name, n.model, n.at, n.pose);
      if (n.id === 'walter') {
        const rod = game.assets.get('props/rod');
        rod.rotation.set(THREE.MathUtils.degToRad(35), 0, 0);
        npc.char.anchor('ANCHOR_hand_R')?.add(rod);
      }
      interaction.add(this.neighborInteractable(n, npc));
    }
    const pelle = this.spawn(TRADER.id, TRADER.name, TRADER.model, TRADER.at, 'stand');
    interaction.add({
      id: 'trader',
      position: pelle.pos,
      radius: 3.4,
      label: () => `${T.sell} (${TRADER.name})`,
      interact: () => this.trade(pelle),
    });

    if (state.round === 0) startRound(state, this.ctx);
  }

  /** Place a character at an anchor (also used by other systems, e.g. the shop). */
  spawn(id: string, name: string, model: string, at: Anchor, pose: Pose): Npc {
    const char = new Character(this.game.assets.get(model));
    char.root.traverse((o) => (o.castShadow = true));
    char.pose = pose;
    const s = SCALE[id] ?? 1;
    char.model.scale.setScalar(s);
    let pos: THREE.Vector3;
    let rot: number;
    if ('anchor' in at) {
      const a = this.world.anchor(at.anchor);
      pos = a.pos.clone();
      rot = a.rot;
      orientationAt(a.x, a.z, rot, char.root.quaternion);
    } else {
      const h = at.h ?? this.world.seabed.height(at.x, at.z);
      pos = mapToWorld(at.x, at.z, h);
      rot = at.rot;
      orientationAt(at.x, at.z, rot, char.root.quaternion);
    }
    char.root.position.copy(pos);
    if (pose === 'lie') {
      // lie on the back along the hammock (+X), face up
      char.model.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(new THREE.Vector3(0, 0, 1), new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0)));
      char.model.position.set(-0.45 * s, 0.05, 0);
    }
    if (pose === 'sit') char.model.position.y = 0.05;
    if (LIFT[id]) char.model.position.y = LIFT[id];
    this.game.scene.add(char.root);
    const tag = document.createElement('div');
    tag.className = 'nametag';
    this.tagLayer.appendChild(tag);
    const npc: Npc = {
      id, name, char, basePose: pose, tag, pos,
      head: char.anchor('head') ?? char.root,
      baseQuat: char.root.quaternion.clone(),
      standing: pose === 'stand',
      talking: false,
      celebrateUntil: 0,
    };
    this.npcs.push(npc);
    return npc;
  }

  /** Let an NPC do a little happy dance. */
  celebrate(npc: Npc, seconds = 2.5): void {
    npc.celebrateUntil = this.time + seconds;
  }

  private neighborInteractable(n: NeighborDef, npc: Npc): Interactable {
    return {
      id: `npc:${n.id}`,
      position: npc.pos,
      radius: n.pose === 'lie' ? 3.6 : 3.2,
      label: () => `${T.talk} (${n.name})`,
      interact: () => this.talk(n, npc),
    };
  }

  private async talk(n: NeighborDef, npc: Npc): Promise<void> {
    const req = this.state.requests[n.id];
    this.player.lock('dialog', true);
    npc.talking = true;
    try {
      if (!req || req.delivered) {
        await this.hud.menu.open({ title: n.name, subtitle: n.title, text: pick(n.lines.done), options: [{ label: T.leave }] });
        return;
      }
      const f = fishById(req.fishId);
      const have = matchingFish(this.state, n.id);
      const text = `${pick(n.lines.greet)} ${fmt(n.lines.request, { fish: `<b>${f.name}</b>`, reward: req.reward })}`;
      const options = [
        have
          ? { label: fmt(T.deliver, { fish: f.name, coins: req.reward }), hint: kg(have.weight) }
          : { label: fmt(T.notYet, { fish: f.name }), disabled: true },
        { label: T.leave },
      ];
      const choice = await this.hud.menu.open({ title: n.name, subtitle: n.title, text, image: this.hud.icon(f.id), options });
      if (choice !== 0 || !have) return;
      const res = deliver(this.state, n.id, this.ctx);
      if (!res) return;
      npc.celebrateUntil = this.time + 2.5;
      this.game.events.emit('coins:changed', { coins: this.state.coins, delta: res.coins });
      this.game.events.emit('request:delivered', { neighborId: n.id, fish: have, coins: res.coins });
      this.game.events.emit('cooler:changed');
      this.player.cooler.refresh();
      await this.hud.menu.open({ title: n.name, subtitle: n.title, text: pick(n.lines.thanks), options: [{ label: T.leave }] });
      // sometimes a neighbor also marks a good spot on your map
      for (const r of n.extraRewards) {
        if (r.type === 'hint' && !this.state.map.known.includes(`spot:${r.spotId}`) && Math.random() < n.extraRewardChance) {
          this.game.events.emit('map:hint', { spotId: r.spotId, from: n.name });
        }
      }
      if (res.roundAdvanced) {
        this.hud.toast(T.roundDone, 'good');
        setTimeout(() => this.hud.toast(fmt(T.roundStart, { round: this.state.round }), 'good'), 900);
        this.game.events.emit('round:started', { round: this.state.round });
      }
    } finally {
      npc.talking = false;
      this.player.lock('dialog', false);
    }
  }

  private async trade(npc: Npc): Promise<void> {
    this.player.lock('dialog', true);
    npc.talking = true;
    try {
      let first = true;
      for (;;) {
        if (!this.state.cooler.length) {
          await this.hud.menu.open({ title: T.traderTitle, text: TRADER.lines.empty, options: [{ label: T.leave }] });
          return;
        }
        const reserved = reservedFish(this.state);
        const sellable = this.state.cooler.filter((f) => !reserved.has(f.uid));
        const total = sellable.reduce((s, f) => s + f.value, 0);
        const options = [
          ...this.state.cooler.map((f) => ({
            label: fmt(T.sellOne, { fish: fishById(f.fishId).name, weight: kg(f.weight), coins: f.value }),
            hint: reserved.has(f.uid) ? fmt(T.reserved, { name: NEIGHBORS.find((n) => n.id === reserved.get(f.uid))!.name }) : undefined,
          })),
          { label: fmt(T.sellAll, { coins: total }), disabled: !sellable.length, hint: reserved.size ? 'Gewünschte Fische werden behalten.' : undefined },
          { label: T.leave },
        ];
        const choice = await this.hud.menu.open({ title: T.traderTitle, text: first ? pick(TRADER.lines.greet) : TRADER.lines.sold, options });
        first = false;
        const n = this.state.cooler.length;
        let uids: string[] = [];
        if (choice < n) uids = [this.state.cooler[choice].uid];
        else if (choice === n) uids = sellable.map((f) => f.uid);
        else return;
        const coins = sellFish(this.state, uids);
        this.game.events.emit('coins:changed', { coins: this.state.coins, delta: coins });
        this.game.events.emit('cooler:changed');
        this.player.cooler.refresh();
      }
    } finally {
      npc.talking = false;
      this.player.lock('dialog', false);
    }
  }

  update(dt: number): void {
    this.time += dt;
    const cam = this.game.camera;
    const pp = this.player.controller.position;
    for (const n of this.npcs) {
      const dist = n.pos.distanceTo(pp);
      // pose
      let pose: Pose = n.basePose;
      if (this.time < n.celebrateUntil && n.standing) pose = 'celebrate';
      else if (n.talking) pose = n.basePose === 'stand' ? 'talk' : n.basePose;
      else if (n.standing && dist < 7 && dist > 3.2) pose = 'wave';
      n.char.pose = pose;
      // standing NPCs turn toward the player when close
      if (n.standing && dist < 8) {
        const up = upAt(n.pos, this.v);
        const to = toTangent(pp.clone().sub(n.pos), up);
        const target = lookOrientation(up, to, new THREE.Quaternion());
        n.char.root.quaternion.slerp(target, Math.min(1, dt * 4));
      } else if (n.standing) n.char.root.quaternion.slerp(n.baseQuat, Math.min(1, dt * 2));
      n.char.update(dt);

      // name tag + wish bubble
      if (dist > 30) {
        n.tag.style.display = 'none';
        continue;
      }
      n.head.getWorldPosition(this.v);
      this.v.addScaledVector(upAt(n.pos, new THREE.Vector3()), n.basePose === 'lie' ? 0.9 : 0.75);
      this.v.project(cam);
      if (this.v.z > 1) {
        n.tag.style.display = 'none';
        continue;
      }
      n.tag.style.display = '';
      n.tag.style.left = `${(this.v.x * 0.5 + 0.5) * innerWidth}px`;
      n.tag.style.top = `${(-this.v.y * 0.5 + 0.5) * innerHeight}px`;
      const req = this.state.requests[n.id];
      let wish = '';
      if (req && !req.delivered) wish = `<div class="wish"><img src="${this.hud.icon(req.fishId)}" alt=""></div>`;
      else if (req?.delivered) wish = `<div class="wish done">✔</div>`;
      const html = `${wish}<b>${n.name}</b>`;
      if (n.tag.dataset.html !== html) {
        n.tag.innerHTML = html;
        n.tag.dataset.html = html;
      }
      n.tag.style.opacity = String(Math.min(1, (30 - dist) / 8));
    }
  }
}

import * as THREE from 'three';
import './ui/styles.css';
import { Game } from './core/Game';
import { World } from './world/World';
import { Environment } from './world/Environment';
import { Player } from './player/Player';
import { InteractionSystem } from './interaction/Interaction';
import { FishingSystem } from './fishing/FishingSystem';
import { SpotMarkers } from './fishing/SpotMarkers';
import { Neighbors } from './npc/Neighbors';
import { Hud } from './ui/Hud';
import { renderFishIcons } from './ui/FishIcons';
import { loadState, saveState } from './state/save';
import { validateData } from './data/validate';
import { T, fmt } from './data/strings';
import { mapToWorld, orientationAt, toTangent, worldToMap } from './planet/Planet';

async function boot(): Promise<void> {
  const canvas = document.getElementById('game') as HTMLCanvasElement;
  const ui = document.getElementById('ui')!;
  ui.innerHTML = `<div class="loading"><div>${T.loading}<small class="progress"></small></div></div>`;
  const game = new Game(canvas);

  const problems = validateData();
  if (problems.length) console.warn('Data problems:\n' + problems.join('\n'));

  await game.assets.loadAll((done, total) => {
    const el = ui.querySelector('.progress');
    if (el) el.textContent = `${done} / ${total}`;
  });

  const { state, isNew } = loadState();
  const world = new World(game.assets);
  world.build();
  game.scene.add(world.root);
  const env = new Environment(game.scene, world.seabed, state.timeOfDay);
  env.setGlows(world.glows);
  const hud = new Hud(game, state, renderFishIcons(game.assets));
  const player = new Player(game, world, state);
  const interaction = new InteractionSystem(game, player, hud);

  // ---- spawn: saved position, or inside the tackle shack facing the rod rack
  const spawn = world.anchor('ANCHOR_spawn');
  const rack = world.anchor('ANCHOR_rack_rod');
  if (state.player) {
    const p = state.player;
    player.controller.teleport(mapToWorld(p.x, p.z, p.h + 0.2), new THREE.Vector3(Math.sin(p.yaw), 0, Math.cos(p.yaw)));
  } else {
    player.controller.teleport(spawn.pos.clone().addScaledVector(spawn.pos.clone().normalize(), 0.1), rack.pos.clone().sub(spawn.pos));
  }
  player.rig.setHeading(toTangent(player.controller.facing.clone(), player.controller.up));

  // ---- the rod on the rack
  if (state.hasRod) {
    player.giveRod(game.assets.get('props/rod'));
  } else {
    const rackRod = game.assets.get('props/rod');
    rackRod.position.copy(rack.pos);
    orientationAt(rack.x, rack.z, rack.rot, rackRod.quaternion);
    rackRod.rotateX(-0.06);
    game.scene.add(rackRod);
    interaction.add({
      id: 'rod-rack',
      position: rack.pos,
      radius: 2.6,
      label: () => (state.hasRod ? null : T.takeRod),
      interact: () => {
        state.hasRod = true;
        rackRod.parent?.remove(rackRod);
        player.giveRod(rackRod);
        interaction.remove('rod-rack');
        hud.toast(fmt(T.gotRod, { fish: game.input.device === 'gamepad' ? 'RT' : 'F' }), 'good');
        game.events.emit('rod:taken');
        saveState(state);
      },
    });
  }

  const neighbors = new Neighbors(game, world, player, hud, state, interaction);
  hud.renderAll();
  const fishing = new FishingSystem(game, player, hud, state, world.seabed);
  const markers = new SpotMarkers(world.seabed);
  game.scene.add(markers.root);

  // ---- saving
  const persist = () => {
    const m = worldToMap(player.controller.position);
    const f = player.controller.facing;
    state.player = { x: m.x, z: m.z, h: Math.max(m.h, 0), yaw: Math.atan2(f.x, f.z) };
    state.timeOfDay = env.hour;
    saveState(state);
  };
  for (const e of ['fish:caught', 'coins:changed', 'request:delivered', 'round:started', 'cooler:changed'] as const) game.events.on(e, persist);
  setInterval(persist, 5000);
  addEventListener('beforeunload', persist);

  game.add({
    update(dt, time) {
      hud.update();
      player.lock('menu', hud.menu.isOpen);
      player.update(dt);
      const prompting = interaction.update();
      fishing.update(dt, time, !prompting);
      neighbors.update(dt);
      markers.update(time, dt);
      env.update(dt, time, player.controller.position, player.rig.camera, player.controller.up);
      hud.clock(env.hour);
    },
  });

  if (game.debug) {
    const { createDebugPanel } = await import('./debug/DebugPanel');
    createDebugPanel(game, env, state, world);
  }
  (window as unknown as Record<string, unknown>).angler = { game, state, player, world, fishing, neighbors, env };

  game.start();

  if (isNew) {
    player.lock('intro', true);
    for (let i = 0; i < T.intro.length; i++) {
      await hud.menu.open({ title: T.title, text: T.intro[i], options: [{ label: i < T.intro.length - 1 ? 'Weiter' : 'Los geht’s!' }] });
    }
    player.lock('intro', false);
  }
}

const view = new URLSearchParams(location.search).get('view');
if (view) {
  import('./debug/ModelViewer').then((m) => m.runModelViewer(document.getElementById('game') as HTMLCanvasElement, view));
} else {
  boot().catch((e) => {
    console.error(e);
    document.getElementById('ui')!.innerHTML = `<div class="loading"><div>Fehler beim Laden 😿<small>${String(e)}</small></div></div>`;
  });
}

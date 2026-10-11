import * as THREE from 'three';
import './ui/styles.css';
import './ui/mobile.css';
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
import { TouchControls } from './ui/TouchControls';
import { MusicPlayer, loadAudioSettings, saveAudioSettings } from './audio/MusicPlayer';
import { musicCredits } from './data/music';
import { MobileShell } from './ui/MobileShell';
import { loadState, saveState } from './state/save';
import { validateData } from './data/validate';
import { T, fmt } from './data/strings';
import { rodTier } from './data/upgrades';
import { ShopSystem } from './economy/ShopSystem';
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
  const touch = new TouchControls(game.input);
  new MobileShell(game.input);
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
    player.giveRod(game.assets.get(rodTier(state.rodTier).model));
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
        hud.toast(fmt(T.gotRod, { fish: game.input.device === 'gamepad' ? 'RT' : game.input.device === 'touch' ? 'den 🎣-Knopf' : 'F' }), 'good');
        game.events.emit('rod:taken');
        saveState(state);
      },
    });
  }

  const neighbors = new Neighbors(game, world, player, hud, state, interaction);
  new ShopSystem(game, neighbors, player, hud, state, interaction);
  hud.renderAll();
  const fishing = new FishingSystem(game, player, hud, state, world.seabed);

  // ---- background music (human-made tracks, see data/music.ts; browsers only allow audio after a user gesture)
  const audio = loadAudioSettings();
  let music: MusicPlayer | null = null;
  hud.setSound(audio.muted);
  const unlockAudio = () => {
    if (music) return;
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    music = new MusicPlayer(ctx);
    music.night = musicNight();
    music.setVolume(audio.volume, audio.muted);
    const player = music;
    ctx.resume().then(() => player.load()).then(() => player.start());
  };
  const toggleMusic = () => {
    audio.muted = !audio.muted;
    saveAudioSettings(audio);
    hud.setSound(audio.muted);
    unlockAudio();
    music?.setVolume(audio.volume, audio.muted);
  };
  hud.onSoundToggle = toggleMusic;
  (window as unknown as Record<string, unknown>).anglerMusic = () => music;
  addEventListener('pointerdown', unlockAudio, { capture: true });
  // iOS Safari only unlocks audio on touchend/click — resume there as well
  for (const ev of ['pointerup', 'touchend', 'click'] as const) {
    addEventListener(ev, () => {
      unlockAudio();
      const ctx = music?.ctx as AudioContext | undefined;
      if (ctx && ctx.state === 'suspended' && !document.hidden) ctx.resume();
    }, { capture: true });
  }
  addEventListener('keydown', (e) => {
    unlockAudio();
    if (e.code === 'KeyM' && !e.repeat) toggleMusic();
  }, { capture: true });
  document.addEventListener('visibilitychange', () => {
    const ctx = music?.ctx as AudioContext | undefined;
    if (!ctx) return;
    if (document.hidden) ctx.suspend();
    else ctx.resume();
  });
  /** 0 = day band … 1 = night band, following the sky. */
  const musicNight = () => Math.min(1, Math.max(0, (env.night - 0.25) / 0.4));
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
  for (const e of ['fish:caught', 'coins:changed', 'request:delivered', 'round:started', 'cooler:changed', 'rod:upgraded'] as const) game.events.on(e, persist);
  setInterval(persist, 5000);
  addEventListener('beforeunload', persist);

  game.add({
    update(dt, time) {
      hud.update();
      touch.update({ prompt: hud.current, fishing: fishing.phase, menuOpen: hud.menu.isOpen });
      player.lock('menu', hud.menu.isOpen);
      player.update(dt);
      const prompting = interaction.update();
      fishing.update(dt, time, !prompting);
      neighbors.update(dt);
      markers.update(time, dt);
      env.update(dt, time, player.controller.position, player.rig.camera, player.controller.up);
      if (music) {
        music.night = musicNight();
        music.update();
      }
      hud.clock(env.hour);
    },
  });

  if (game.debug) {
    const { createDebugPanel } = await import('./debug/DebugPanel');
    createDebugPanel(game, env, state, world);
  }
  (window as unknown as Record<string, unknown>).angler = { game, state, player, world, fishing, neighbors, env };

  game.start();
  await MobileShell.startGate();

  if (isNew) {
    player.lock('intro', true);
    for (let i = 0; i < T.intro.length; i++) {
      const last = i === T.intro.length - 1;
      const text = last ? `${T.intro[i]}<br><small>${fmt(T.musicCredit, { credits: musicCredits() })}</small>` : T.intro[i];
      await hud.menu.open({ title: T.title, text, options: [{ label: last ? 'Los geht’s!' : 'Weiter' }] });
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

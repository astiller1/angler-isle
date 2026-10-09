import GUI from 'lil-gui';
import type { Game } from '../core/Game';
import { CAMERA_SETTINGS } from '../player/CameraRig';
import { PLAYER_SETTINGS } from '../player/PlayerController';
import { WATER_SETTINGS } from '../planet/Water';
import { FISHING } from '../fishing/logic';
import { LIGHT_SETTINGS, type Environment } from '../world/Environment';
import type { GameState } from '../state/GameState';
import type { World } from '../world/World';

/** `?debug`: live tuning panel + FPS / draw-call counter. Copy good values back into the source. */
export function createDebugPanel(game: Game, env: Environment, state: GameState, world: World): void {
  const gui = new GUI({ title: 'Debug' });
  const cam = gui.addFolder('Kamera');
  cam.add(CAMERA_SETTINGS, 'distance', 2, 40);
  cam.add(CAMERA_SETTINGS, 'pivotHeight', 0, 4);
  cam.add(CAMERA_SETTINGS, 'yawSpeed', 0.5, 5);
  cam.add(CAMERA_SETTINGS, 'fov', 40, 90).onChange((v: number) => {
    game.camera.fov = v;
    game.camera.updateProjectionMatrix();
  });
  const pl = gui.addFolder('Spieler');
  pl.add(PLAYER_SETTINGS, 'walkSpeed', 1, 12);
  pl.add(PLAYER_SETTINGS, 'sprintSpeed', 1, 20);
  pl.add(PLAYER_SETTINGS, 'jumpSpeed', 2, 15);
  pl.add(PLAYER_SETTINGS, 'gravity', 5, 50);
  const fi = gui.addFolder('Angeln');
  fi.add(FISHING, 'reelRate', 0.05, 0.5);
  fi.add(FISHING, 'biteWindow', 0.3, 3);
  fi.add(FISHING, 'snapTime', 0.1, 2);
  const wa = gui.addFolder('Wasser & Licht');
  const u = env.water.material.uniforms;
  wa.addColor(WATER_SETTINGS, 'shallow').onChange((v: string) => u.uShallow.value.set(v));
  wa.addColor(WATER_SETTINGS, 'mid').onChange((v: string) => u.uMid.value.set(v));
  wa.addColor(WATER_SETTINGS, 'deep').onChange((v: string) => u.uDeep.value.set(v));
  wa.add(WATER_SETTINGS, 'waveSpeed', 0, 3);
  wa.add(u.uFoamWidth, 'value', 0, 2).name('foamWidth');
  wa.add(env.sun, 'intensity', 0, 6).name('sun');
  wa.add(env.hemi, 'intensity', 0, 4).name('ambient');
  wa.add(LIGHT_SETTINGS, 'fogDensity', 0, 0.02).onChange((v: number) => ((game.scene.fog as { density: number }).density = v));
  const cheats = gui.addFolder('Cheats');
  cheats.add({ coins: () => (state.coins += 500) }, 'coins').name('+500 Münzen');
  cheats.add({ col: () => (world.collision.mesh!.visible = !world.collision.mesh!.visible) }, 'col').name('Kollision zeigen');
  if (world.collision.mesh) game.scene.add(world.collision.mesh);
  gui.close();

  const stats = document.createElement('div');
  stats.style.cssText = 'position:fixed;left:50%;bottom:4px;transform:translateX(-50%);font:12px monospace;color:#fff;background:#0007;padding:2px 8px;border-radius:6px;z-index:10';
  document.body.appendChild(stats);
  let frames = 0;
  let last = performance.now();
  const tick = () => {
    frames++;
    const now = performance.now();
    if (now - last > 500) {
      const info = game.renderer.info.render;
      stats.textContent = `${Math.round((frames * 1000) / (now - last))} fps · ${info.calls} draws · ${Math.round(info.triangles / 1000)}k tris`;
      frames = 0;
      last = now;
    }
    requestAnimationFrame(tick);
  };
  tick();
}

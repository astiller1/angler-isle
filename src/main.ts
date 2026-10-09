import * as THREE from 'three';
import './ui/styles.css';
import { Game } from './core/Game';
import { Collision } from './world/Collision';
import { Seabed } from './world/Seabed';
import { Environment } from './world/Environment';
import { CameraRig, CAMERA_SETTINGS } from './player/CameraRig';
import { PlayerController } from './player/PlayerController';
import { mapToWorld, toTangent, upAt } from './planet/Planet';

async function boot() {
  const canvas = document.getElementById('game') as HTMLCanvasElement;
  const game = new Game(canvas);
  const ui = document.getElementById('ui')!;
  ui.innerHTML = `<div class="loading">Lade Insel…</div>`;
  await game.assets.loadAll();

  const terrain = game.assets.get('terrain/island');
  terrain.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) o.castShadow = false;
  });
  game.scene.add(terrain);

  const collision = new Collision();
  terrain.traverse((o) => (o as THREE.Mesh).isMesh && collision.addMesh(o as THREE.Mesh));
  collision.build();
  const seabed = new Seabed(collision.bvh!);
  const env = new Environment(game.scene, seabed);

  const rig = new CameraRig(innerWidth / innerHeight, collision);
  game.camera = rig.camera;

  const player = new PlayerController(collision, seabed);
  player.teleport(mapToWorld(62, -3, 4), new THREE.Vector3(1, 0, 0));
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.32, 0.4, 4, 8), new THREE.MeshLambertMaterial({ color: '#F3A24B' }));
  body.position.y = 0.52;
  body.castShadow = true;
  const avatar = new THREE.Group();
  avatar.add(body);
  game.scene.add(avatar);

  const wish = new THREE.Vector3();
  game.add({
    update(dt, time) {
      const inp = game.input;
      wish.set(0, 0, 0).addScaledVector(rig.forward, inp.move.y).addScaledVector(rig.right, inp.move.x);
      player.update({ dir: wish, sprint: inp.held('sprint'), jump: inp.pressed('jump') }, dt);
      avatar.position.copy(player.position);
      avatar.quaternion.copy(player.quaternion);
      rig.update(player.position, inp.look, inp.mouseDelta, dt);
      env.update(time, player.position, rig.camera, player.up);
    },
  });
  void toTangent;
  void upAt;
  ui.innerHTML = '';
  game.start();
  (window as unknown as { game: unknown }).game = { game, player, rig, seabed, CAMERA_SETTINGS, env };
}

const view = new URLSearchParams(location.search).get("view");
if (view) {
  import("./debug/ModelViewer").then((m) => m.runModelViewer(document.getElementById("game") as HTMLCanvasElement, view));
} else {
  boot();
}

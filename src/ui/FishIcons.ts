import * as THREE from 'three';
import type { Assets } from '../core/Assets';
import { FISH } from '../data/fish';

/** Renders every fish model once into a small PNG (data URL) for the HUD. */
export function renderFishIcons(assets: Assets): Map<string, string> {
  const W = 160;
  const H = 96;
  const canvas = document.createElement('canvas');
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, preserveDrawingBuffer: true });
  renderer.setSize(W, H, false);
  renderer.toneMapping = THREE.NeutralToneMapping;
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight('#ffffff', '#ffd9b0', 2.0));
  const sun = new THREE.DirectionalLight('#ffffff', 1.6);
  sun.position.set(1, 2, 3);
  scene.add(sun);
  const cam = new THREE.OrthographicCamera(-0.62, 0.62, 0.37, -0.37, 0.1, 10);
  cam.position.set(2, 0.15, 0);
  cam.lookAt(0, 0, 0);
  const out = new Map<string, string>();
  for (const f of FISH) {
    const m = assets.get(f.model);
    m.rotation.y = 0; // head (+Z) points left in this view
    scene.add(m);
    renderer.render(scene, cam);
    out.set(f.id, canvas.toDataURL('image/png'));
    scene.remove(m);
  }
  renderer.dispose();
  renderer.forceContextLoss();
  return out;
}

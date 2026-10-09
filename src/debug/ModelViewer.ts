import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Assets } from '../core/Assets';

/**
 * `?view=characters/cat` — inspect a single exported model (turntable + orbit), or `?view=all`
 * for a grid of every model. Handy after `npm run art`.
 */
export async function runModelViewer(canvas: HTMLCanvasElement, key: string): Promise<void> {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(innerWidth, innerHeight);
  renderer.toneMapping = THREE.NeutralToneMapping;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#BFE3F2');
  scene.add(new THREE.HemisphereLight('#CFE8FF', '#F5C9A0', 1.4));
  const sun = new THREE.DirectionalLight('#FFE2B8', 2.4);
  sun.position.set(-3, 5, 4);
  scene.add(sun);
  const camera = new THREE.PerspectiveCamera(40, innerWidth / innerHeight, 0.01, 500);
  const controls = new OrbitControls(camera, canvas);

  const assets = new Assets();
  await assets.loadAll(undefined, (k) => !k.startsWith('terrain'));
  const keys = key === 'all' ? Assets.keys().filter((k) => !k.startsWith('terrain')) : key.endsWith('/') ? Assets.keys().filter((k) => k.startsWith(key)) : [key];
  const group = new THREE.Group();
  const cols = Math.ceil(Math.sqrt(keys.length));
  const maxSize = Math.min(5, Math.max(...keys.map((k) => new THREE.Box3().setFromObject(assets.source(k)).getSize(new THREE.Vector3()).length())));
  let x = 0;
  keys.forEach((k, i) => {
    const m = assets.get(k);
    const box = new THREE.Box3().setFromObject(m);
    const size = box.getSize(new THREE.Vector3());
    const cell = keys.length > 1 ? maxSize * 1.1 : 0;
    m.position.set((i % cols) * cell - box.getCenter(new THREE.Vector3()).x, -box.min.y, Math.floor(i / cols) * cell);
    if (keys.length > 1 && Math.max(size.x, size.y, size.z) > 5) m.scale.setScalar(5 / Math.max(size.x, size.y, size.z));
    group.add(m);
    x = Math.max(x, size.length());
  });
  scene.add(group);
  const colMeshes: THREE.Object3D[] = [];
  group.traverse((o) => /^COLP?_/.test(o.name) && colMeshes.push(o));
  const colMat = new THREE.MeshBasicMaterial({ color: 0xff00ff, wireframe: true });
  colMeshes.forEach((o) => {
    (o as THREE.Mesh).material = colMat;
    o.visible = false;
  });
  addEventListener('keydown', (e) => e.code === 'KeyC' && colMeshes.forEach((o) => (o.visible = !o.visible)));
  const box = new THREE.Box3().setFromObject(group);
  const center = box.getCenter(new THREE.Vector3());
  const radius = box.getSize(new THREE.Vector3()).length() * 0.6;
  camera.position.copy(center).add(new THREE.Vector3(0.6, 0.45, 1).normalize().multiplyScalar(radius * 2.2));
  controls.target.copy(center);
  const grid = new THREE.GridHelper(Math.max(4, radius * 4), 20, 0x88aabb, 0xaaccdd);
  grid.position.y = box.min.y;
  scene.add(grid);

  const label = document.createElement('div');
  label.style.cssText = 'position:fixed;left:12px;top:10px;font:14px monospace;color:#234;background:#fff8;padding:4px 8px;border-radius:6px';
  label.textContent = keys.length > 1 ? `${keys.length} models` : `${key} — size ${box.getSize(new THREE.Vector3()).toArray().map((v) => v.toFixed(2)).join(' × ')} m`;
  document.body.appendChild(label);

  addEventListener('resize', () => {
    renderer.setSize(innerWidth, innerHeight);
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
  });
  renderer.setAnimationLoop(() => {
    if (keys.length === 1) group.rotation.y += 0.004;
    controls.update();
    renderer.render(scene, camera);
  });
}

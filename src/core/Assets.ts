import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

/** Every .glb under /art, keyed like "props/cooler_small". */
const URLS = import.meta.glob('/art/**/*.glb', { query: '?url', import: 'default', eager: true }) as Record<string, string>;
const KEYED: Record<string, string> = Object.fromEntries(
  Object.entries(URLS).map(([path, url]) => [path.replace(/^\/art\//, '').replace(/\.glb$/, ''), url]),
);

/** The shared material for all palette (vertex-colored) models. */
export const paletteMaterial = new THREE.MeshLambertMaterial({ vertexColors: true });

export class Assets {
  private scenes = new Map<string, THREE.Group>();

  static keys(): string[] {
    return Object.keys(KEYED);
  }

  async loadAll(onProgress?: (done: number, total: number) => void, filter?: (key: string) => boolean): Promise<void> {
    const loader = new GLTFLoader();
    const keys = Assets.keys().filter((k) => !filter || filter(k));
    let done = 0;
    await Promise.all(
      keys.map(async (key) => {
        const gltf = await loader.loadAsync(KEYED[key]);
        gltf.scene.traverse((o) => {
          const m = o as THREE.Mesh;
          if (m.isMesh) {
            m.material = paletteMaterial;
            m.castShadow = true;
            m.receiveShadow = true;
          }
        });
        this.scenes.set(key, gltf.scene);
        onProgress?.(++done, keys.length);
      }),
    );
  }

  has(key: string): boolean {
    return this.scenes.has(key);
  }

  /** A fresh clone (geometry shared). */
  get(key: string): THREE.Group {
    const s = this.scenes.get(key);
    if (!s) throw new Error(`Missing asset "${key}" — run \`npm run art\`?`);
    return s.clone(true);
  }

  /** The original (do not add to the scene; read-only use such as instancing). */
  source(key: string): THREE.Group {
    const s = this.scenes.get(key);
    if (!s) throw new Error(`Missing asset "${key}"`);
    return s;
  }
}

/** Split a loaded model into render meshes and COL_* collision meshes (removed from the model). */
export function extractCollision(root: THREE.Object3D): THREE.Mesh[] {
  const cols: THREE.Mesh[] = [];
  root.traverse((o) => {
    if (/^COLP?_/.test(o.name) && (o as THREE.Mesh).isMesh) cols.push(o as THREE.Mesh);
  });
  for (const c of cols) c.parent?.remove(c);
  return cols;
}

export function findNode(root: THREE.Object3D, name: string): THREE.Object3D | undefined {
  let found: THREE.Object3D | undefined;
  root.traverse((o) => {
    if (!found && o.name === name) found = o;
  });
  return found;
}

import shape from '../../art/terrain/island_shape.json';
import type { Game } from '../core/Game';
import { MAP_SETTINGS } from '../data/map';
import { T, fmt } from '../data/strings';
import type { MapSystem } from '../map/MapSystem';
import type { GameState } from '../state/GameState';
import type { Seabed } from '../world/Seabed';
import type { Hud } from './Hud';

/** Base map resolution in pixels (1 px ≈ 1 m). */
const PX = 480;
const FOG_RGB = [236, 223, 190];

type RGB = [number, number, number];
const hex = (h: string): RGB => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const mix = (a: RGB, b: RGB, t: number): RGB => {
  const u = Math.max(0, Math.min(1, t));
  return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u];
};
const C = {
  shallow: hex('#a7ece2'),
  mid: hex('#4fc3d8'),
  deep: hex('#2b86c0'),
  foam: hex('#effcff'),
  sand: hex('#f3dea2'),
  grass: hex('#9fd273'),
  forest: hex('#4f9e58'),
  rock: hex('#b9b0a2'),
  path: '#e9c98b',
  house: '#d4835a',
  houseEdge: '#7a4a30',
};

export interface MapLive {
  /** Cat position + heading (map coordinates / screen degrees, 0 = east, clockwise). */
  you: { x: number; z: number; heading: number };
  /** Moored boat (when not aboard). */
  boat: { x: number; z: number } | null;
}

/** The fold-out map (K / Select / 🗺): painted island, fog of war, discovered markers, you and your boat. */
export class MapView {
  isOpen = false;
  private root: HTMLDivElement;
  private canvas: HTMLCanvasElement;
  private base: HTMLCanvasElement;
  private fogSmall: HTMLCanvasElement;
  private markerEls = new Map<string, HTMLDivElement>();
  private youEl: HTMLDivElement;
  private boatEl: HTMLDivElement;
  private footer: HTMLElement;
  private drawnVersion = -1;
  private openedAt = 0;
  private declutter = false;

  constructor(
    private game: Game,
    private hud: Hud,
    private state: GameState,
    private map: MapSystem,
    seabed: Seabed,
    footprints: { x: number; z: number; rot: number; min: { x: number; y: number }; max: { x: number; y: number } }[],
    private live: () => MapLive,
    private canOpen: () => boolean,
  ) {
    this.root = document.createElement('div');
    this.root.className = 'map-overlay hidden';
    this.root.innerHTML = `
      <div class="map-panel">
        <div class="map-head"><b>🗺 ${T.mapTitle}</b><button class="map-close" aria-label="${T.mapClose}">✕</button></div>
        <div class="map-box">
          <canvas width="${PX}" height="${PX}"></canvas>
          <div class="map-compass">N<span>▲</span></div>
          <div class="map-markers"></div>
        </div>
        <div class="map-foot"></div>
      </div>`;
    hud.root.appendChild(this.root);
    this.canvas = this.root.querySelector('canvas')!;
    this.footer = this.root.querySelector('.map-foot')!;
    const close = this.root.querySelector('.map-close') as HTMLButtonElement;
    close.addEventListener('pointerdown', (e) => e.stopPropagation());
    close.addEventListener('click', () => this.close());
    this.root.addEventListener('pointerdown', (e) => e.stopPropagation());
    this.root.addEventListener('click', (e) => {
      if (e.target === this.root && performance.now() - this.openedAt > 300) this.close();
    });
    this.base = this.paintBase(seabed, footprints);
    this.fogSmall = document.createElement('canvas');
    this.fogSmall.width = this.fogSmall.height = MAP_SETTINGS.cells;
    const layer = this.root.querySelector('.map-markers') as HTMLDivElement;
    for (const m of map.markers) {
      const el = document.createElement('div');
      el.className = `mk mk-${m.kind}`;
      el.innerHTML = `<span class="ic">${m.icon}</span><span class="lb">${m.name}</span>`;
      if (m.sub) el.title = m.sub;
      this.place(el, m.x, m.z);
      layer.appendChild(el);
      this.markerEls.set(m.id, el);
    }
    this.boatEl = document.createElement('div');
    this.boatEl.className = 'mk mk-boat';
    this.boatEl.innerHTML = `<span class="ic">🚣</span><span class="lb">${T.mapBoat}</span>`;
    layer.appendChild(this.boatEl);
    this.youEl = document.createElement('div');
    this.youEl.className = 'mk-you';
    this.youEl.innerHTML = `<span class="arrow"></span><span class="lb">${T.mapYou}</span>`;
    layer.appendChild(this.youEl);
    hud.onMapButton = () => (this.isOpen ? this.close() : this.open());
  }

  private place(el: HTMLElement, x: number, z: number): void {
    const h = MAP_SETTINGS.half;
    el.style.left = `${((x + h) / (2 * h)) * 100}%`;
    el.style.top = `${((z + h) / (2 * h)) * 100}%`;
  }

  /** Call every frame: toggles on K / Select, closes on Esc / B. */
  update(): void {
    const inp = this.game.input;
    if (!this.isOpen) {
      if (inp.pressed('map')) this.open();
      return;
    }
    if (inp.pressed('map') || inp.pressed('back') || inp.pressed('menu')) {
      inp.consume('menu');
      inp.consume('back');
      this.close();
      return;
    }
    this.refreshLive();
  }

  open(): void {
    if (this.isOpen || this.hud.menu.isOpen || !this.canOpen()) return;
    this.isOpen = true;
    this.openedAt = performance.now();
    this.root.classList.remove('hidden');
    this.game.input.consume('cancel');
    this.redraw();
    this.refreshLive();
  }

  close(): void {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.root.classList.add('hidden');
    // don't let the closing key also cast / jump / open the game menu
    for (const a of ['menu', 'back', 'cancel', 'fish', 'interact', 'jump'] as const) this.game.input.consume(a);
  }

  private redraw(): void {
    if (this.drawnVersion === this.map.version) return;
    this.drawnVersion = this.map.version;
    const n = MAP_SETTINGS.cells;
    const fctx = this.fogSmall.getContext('2d')!;
    const img = fctx.createImageData(n, n);
    for (let c = 0; c < n * n; c++) {
      const k = c * 4;
      const noise = ((c * 2654435761) >>> 24) / 255 - 0.5;
      img.data[k] = FOG_RGB[0] + noise * 10;
      img.data[k + 1] = FOG_RGB[1] + noise * 10;
      img.data[k + 2] = FOG_RGB[2] + noise * 8;
      img.data[k + 3] = this.map.fog.has(c) ? 0 : 255;
    }
    fctx.putImageData(img, 0, 0);
    const ctx = this.canvas.getContext('2d')!;
    ctx.drawImage(this.base, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(this.fogSmall, 0, 0, PX, PX);
    for (const m of this.map.markers) this.markerEls.get(m.id)!.classList.toggle('hidden', !this.map.isKnown(m));
    this.declutter = true;
    const pct = Math.round(this.map.fog.explored() * 100);
    this.footer.textContent = `${T.mapLegend} · ${fmt(T.mapExplored, { pct })}`;
  }

  private refreshLive(): void {
    this.redraw();
    const l = this.live();
    this.place(this.youEl, l.you.x, l.you.z);
    (this.youEl.firstElementChild as HTMLElement).style.transform = `translate(-50%, -50%) rotate(${l.you.heading}deg)`;
    this.boatEl.classList.toggle('hidden', !l.boat);
    if (l.boat) this.place(this.boatEl, l.boat.x, l.boat.z);
    // neighbors with an open wish get a little "!" badge
    for (const m of this.map.markers) {
      if (m.kind !== 'person') continue;
      const req = this.state.requests[m.id];
      this.markerEls.get(m.id)!.classList.toggle('wants', !!req && !req.delivered);
    }
    if (this.declutter) this.hideOverlappingLabels();
  }

  /** Where labels would overlap, keep only the more important one (spots > piers > people > places). */
  private hideOverlappingLabels(): void {
    this.declutter = false;
    const order: Record<string, number> = { boatspot: 0, spot: 1, dock: 2, person: 3, place: 4 };
    const placed: DOMRect[] = [this.youEl.getBoundingClientRect()];
    const list = this.map.markers.filter((m) => this.map.isKnown(m)).sort((a, b) => order[a.kind] - order[b.kind]);
    for (const m of list) {
      const el = this.markerEls.get(m.id)!;
      el.classList.remove('nolabel');
      const r = el.querySelector('.lb')!.getBoundingClientRect();
      const hit = placed.some((p) => r.left < p.right && r.right > p.left && r.top < p.bottom && r.bottom > p.top);
      if (hit) el.classList.add('nolabel');
      else placed.push(r);
    }
  }

  /** Paint the island once: water depth, sand, grass, forest, rock with hill shading; paths; houses. */
  private paintBase(
    seabed: Seabed,
    footprints: { x: number; z: number; rot: number; min: { x: number; y: number }; max: { x: number; y: number } }[],
  ): HTMLCanvasElement {
    const cv = document.createElement('canvas');
    cv.width = cv.height = PX;
    const ctx = cv.getContext('2d')!;
    const img = ctx.createImageData(PX, PX);
    const half = MAP_SETTINGS.half;
    const s = (2 * half) / PX;
    const H = new Float32Array(PX * PX);
    for (let j = 0; j < PX; j++) for (let i = 0; i < PX; i++) H[j * PX + i] = seabed.height(-half + (i + 0.5) * s, -half + (j + 0.5) * s);
    const at = (i: number, j: number) => H[Math.min(PX - 1, Math.max(0, j)) * PX + Math.min(PX - 1, Math.max(0, i))];
    for (let j = 0; j < PX; j++) {
      for (let i = 0; i < PX; i++) {
        const h = at(i, j);
        const gx = (at(i + 1, j) - at(i - 1, j)) / (2 * s);
        const gz = (at(i, j + 1) - at(i, j - 1)) / (2 * s);
        let c: RGB;
        if (h < -0.05) {
          const coast = h > -1.2 && (at(i + 1, j) >= -0.05 || at(i - 1, j) >= -0.05 || at(i, j + 1) >= -0.05 || at(i, j - 1) >= -0.05);
          c = coast ? C.foam : h > -2.5 ? mix(C.shallow, C.mid, (-h - 0.05) / 2.4) : mix(C.mid, C.deep, (-h - 2.5) / 5);
        } else {
          const slope = Math.hypot(gx, gz);
          c = h < 0.9 ? C.sand : mix(C.grass, C.forest, (h - 2.5) / 12);
          if (slope > 0.85) c = mix(c, C.rock, Math.min(1, (slope - 0.85) * 2));
          // hill shading (light from the north-west)
          const shade = Math.max(0.72, Math.min(1.18, 1 + (gx + gz) * 0.28));
          c = [c[0] * shade, c[1] * shade, c[2] * shade];
        }
        const k = (j * PX + i) * 4;
        img.data[k] = c[0];
        img.data[k + 1] = c[1];
        img.data[k + 2] = c[2];
        img.data[k + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    const toPx = (x: number) => (x + half) / s;
    // faint chart grid
    ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    ctx.lineWidth = 1;
    for (let v = -half + 40; v < half; v += 40) {
      ctx.beginPath();
      ctx.moveTo(toPx(v), 0);
      ctx.lineTo(toPx(v), PX);
      ctx.moveTo(0, toPx(v));
      ctx.lineTo(PX, toPx(v));
      ctx.stroke();
    }
    // sandy paths
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = C.path;
    for (const p of shape.paths) {
      ctx.lineWidth = p.w / s;
      ctx.beginPath();
      (p.pts as [number, number][]).forEach(([x, z], k) => (k ? ctx.lineTo(toPx(x), toPx(z)) : ctx.moveTo(toPx(x), toPx(z))));
      ctx.stroke();
    }
    // buildings, piers (footprints of the placed models)
    for (const f of footprints) {
      const w = f.max.x - f.min.x;
      const d = f.max.y - f.min.y;
      if (w * d > 2500 || Math.max(w, d) < 1.5) continue;
      ctx.save();
      ctx.translate(toPx(f.x), toPx(f.z));
      // model local (x, z) -> map: rotateLocal(lx, lz, rot) = (lx·c + lz·s, −lx·s + lz·c) → canvas rotation by −rot
      ctx.rotate((-f.rot * Math.PI) / 180);
      const long = Math.max(w, d) > 8;
      ctx.fillStyle = long ? '#c99a62' : C.house;
      ctx.strokeStyle = C.houseEdge;
      ctx.lineWidth = 0.8;
      ctx.fillRect(f.min.x / s, f.min.y / s, w / s, d / s);
      ctx.strokeRect(f.min.x / s, f.min.y / s, w / s, d / s);
      ctx.restore();
    }
    return cv;
  }
}

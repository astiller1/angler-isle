import type { Game } from '../core/Game';
import { MAP_SETTINGS } from '../data/map';
import { SPOTS } from '../data/spots';
import { T, fmt } from '../data/strings';
import type { GameState } from '../state/GameState';
import type { Hud } from '../ui/Hud';
import { FogGrid } from './Exploration';

export type MarkerKind = 'spot' | 'boatspot' | 'dock' | 'person' | 'place';

export interface MapMarker {
  id: string;
  kind: MarkerKind;
  icon: string;
  name: string;
  /** Short second line (e.g. "Fischhändler"). */
  sub?: string;
  x: number;
  z: number;
}

/**
 * Exploration: reveals the fog around the cat as it walks or rows around, discovers markers
 * (spots, piers, neighbors, places) once their area is explored, and handles neighbor map hints.
 */
export class MapSystem {
  readonly fog: FogGrid;
  readonly markers: MapMarker[] = [];
  private known: Set<string>;
  private timer = 0;
  /** Bumped whenever the fog or the known markers change (the map view redraws then). */
  version = 0;

  constructor(
    game: Game,
    private hud: Hud,
    private state: GameState,
  ) {
    const S = MAP_SETTINGS;
    this.fog = new FogGrid(S.half, S.cells, state.map.fog);
    this.known = new Set(state.map.known);
    if (!state.map.fog) this.fog.reveal(S.start.x, S.start.z, S.start.r);
    game.events.on('map:hint', ({ spotId, from }) => {
      const spot = SPOTS.find((s) => s.id === spotId);
      if (!spot) return;
      this.fog.reveal(spot.x, spot.z, spot.radius + 14);
      this.discover(true);
      this.known.add(`spot:${spot.id}`);
      this.hud.toast(fmt(T.mapHint, { name: from, spot: spot.name }), 'good');
      this.version++;
    });
  }

  addMarkers(list: MapMarker[]): void {
    this.markers.push(...list);
    this.discover(true);
  }

  isKnown(m: MapMarker): boolean {
    return this.known.has(m.id);
  }

  /** Reveal around the cat (map coordinates) a few times per second. */
  update(dt: number, x: number, z: number, inBoat: boolean): void {
    this.timer -= dt;
    if (this.timer > 0) return;
    this.timer = 0.25;
    const added = this.fog.reveal(x, z, inBoat ? MAP_SETTINGS.revealInBoat : MAP_SETTINGS.revealOnFoot);
    if (added) {
      this.version++;
      this.discover(false);
    }
  }

  /** Mark markers in explored cells as known; toast the new ones unless `silent`. */
  private discover(silent: boolean): void {
    const fresh: MapMarker[] = [];
    for (const m of this.markers) {
      if (this.known.has(m.id) || !this.fog.isRevealed(m.x, m.z)) continue;
      this.known.add(m.id);
      fresh.push(m);
    }
    if (!fresh.length) return;
    this.version++;
    if (silent) return;
    for (const m of fresh.slice(0, 3)) this.hud.toast(fmt(T.mapNew, { name: `${m.icon} ${m.name}` }), 'info');
  }

  /** Write fog + known markers into the save state. */
  save(): void {
    this.state.map.fog = this.fog.encode();
    this.state.map.known = [...this.known];
  }
}

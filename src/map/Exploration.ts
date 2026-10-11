/**
 * Fog of war for the map (pure, no three.js): a square grid of explored cells over the charted area,
 * stored compactly as a base64 bit field in the save.
 */
export class FogGrid {
  readonly bits: Uint8Array;

  constructor(
    readonly half: number,
    readonly cells: number,
    encoded = '',
  ) {
    this.bits = new Uint8Array(Math.ceil((cells * cells) / 8));
    if (encoded) {
      try {
        const raw = atob(encoded);
        for (let i = 0; i < Math.min(raw.length, this.bits.length); i++) this.bits[i] = raw.charCodeAt(i);
      } catch {
        /* corrupt → start unexplored */
      }
    }
  }

  get cellSize(): number {
    return (2 * this.half) / this.cells;
  }

  /** Cell index of map (x, z), or -1 outside the charted area. */
  cellAt(x: number, z: number): number {
    const i = Math.floor((x + this.half) / this.cellSize);
    const j = Math.floor((z + this.half) / this.cellSize);
    if (i < 0 || j < 0 || i >= this.cells || j >= this.cells) return -1;
    return j * this.cells + i;
  }

  has(cell: number): boolean {
    return cell >= 0 && (this.bits[cell >> 3] & (1 << (cell & 7))) !== 0;
  }

  isRevealed(x: number, z: number): boolean {
    return this.has(this.cellAt(x, z));
  }

  /** Reveal all cells whose center is within r of (x, z). Returns how many cells were newly revealed. */
  reveal(x: number, z: number, r: number): number {
    const cs = this.cellSize;
    const i0 = Math.max(0, Math.floor((x - r + this.half) / cs));
    const i1 = Math.min(this.cells - 1, Math.floor((x + r + this.half) / cs));
    const j0 = Math.max(0, Math.floor((z - r + this.half) / cs));
    const j1 = Math.min(this.cells - 1, Math.floor((z + r + this.half) / cs));
    let added = 0;
    for (let j = j0; j <= j1; j++) {
      for (let i = i0; i <= i1; i++) {
        const cx = -this.half + (i + 0.5) * cs;
        const cz = -this.half + (j + 0.5) * cs;
        if ((cx - x) ** 2 + (cz - z) ** 2 > r * r) continue;
        const c = j * this.cells + i;
        if (!this.has(c)) {
          this.bits[c >> 3] |= 1 << (c & 7);
          added++;
        }
      }
    }
    return added;
  }

  /** Fraction of the charted area explored (0..1). */
  explored(): number {
    let n = 0;
    for (let c = 0; c < this.cells * this.cells; c++) if (this.has(c)) n++;
    return n / (this.cells * this.cells);
  }

  encode(): string {
    let s = '';
    for (const b of this.bits) s += String.fromCharCode(b);
    return btoa(s);
  }
}

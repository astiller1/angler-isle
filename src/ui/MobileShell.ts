import { IS_TOUCH_DEVICE, type Input } from '../core/Input';

/**
 * Phone/tablet shell: landscape-only play.
 * - A "tap to play" gate (a user gesture is required) enters fullscreen and locks landscape where the
 *   browser allows it (Android Chrome). iOS Safari cannot lock — there we rely on the rotate hint.
 * - In portrait a "please rotate" overlay covers the game and input is paused.
 * - `body.compact` switches the HUD to the compact landscape layout on short screens.
 */
export class MobileShell {
  private rotateEl: HTMLDivElement;
  private portrait = matchMedia('(orientation: portrait)');

  constructor(private input: Input) {
    this.rotateEl = document.createElement('div');
    this.rotateEl.id = 'rotate';
    this.rotateEl.innerHTML = `<div class="rotate-phone">📱</div><div>Bitte dreh dein Handy ins Querformat</div><small>Die Angler-Insel wird quer gespielt.</small>`;
    document.body.appendChild(this.rotateEl);
    const apply = () => this.apply();
    this.portrait.addEventListener('change', apply);
    addEventListener('resize', apply);
    input.onDeviceChange(apply);
    apply();
  }

  private apply(): void {
    const touch = this.input.device === 'touch' || IS_TOUCH_DEVICE;
    const portrait = this.portrait.matches;
    document.body.classList.toggle('compact', innerHeight <= 560 || (touch && Math.min(innerWidth, innerHeight) <= 560));
    this.rotateEl.classList.toggle('show', touch && portrait);
    this.input.paused = touch && portrait;
  }

  /** On touch devices: wait for a tap, then go fullscreen + landscape (best effort). */
  static async startGate(): Promise<void> {
    if (!IS_TOUCH_DEVICE) return;
    const gate = document.createElement('div');
    gate.id = 'gate';
    gate.innerHTML = `<div class="gate-title">🐟 Angler-Insel</div><button class="gate-btn">▶ Tippen zum Spielen</button><small>Quer halten · Vollbild</small>`;
    document.body.appendChild(gate);
    await new Promise<void>((resolve) => {
      gate.addEventListener('pointerup', (e) => {
        e.preventDefault();
        // never block the game on these: they may be refused or never settle (iPhone, embedded views)
        const lock = () => {
          const o = screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> };
          o?.lock?.('landscape').catch(() => undefined);
        };
        try {
          const req = document.documentElement.requestFullscreen?.({ navigationUI: 'hide' });
          if (req) req.then(lock, () => undefined);
          else lock();
        } catch {
          /* fullscreen unsupported — play in the browser window; the rotate hint covers portrait */
        }
        gate.remove();
        resolve();
      }, { once: true });
    });
  }
}

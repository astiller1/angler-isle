import type { Action, Input } from '../core/Input';

/** What the big context button should do and show this frame. */
export interface TouchContext {
  /** Current HUD prompt (from Hud.prompt), if any. */
  prompt: { action: Action; text: string } | null;
  /** Fishing phase (FishingSystem.phase). */
  fishing: string;
  /** A menu is open (buttons hidden — options are tapped directly). */
  menuOpen: boolean;
}

const STICK_RADIUS = 56;

/**
 * On-screen controls for phones (landscape):
 * - left half: floating joystick (appears where the thumb lands; push far = run)
 * - right half: drag to turn the camera
 * - bottom right: big context button (cast/hook/reel/talk/buy…), jump, cancel
 * Feeds the same abstract actions as keyboard/gamepad (Input.setVirtual / touchMove / addTouchLook).
 */
export class TouchControls {
  readonly root: HTMLDivElement;
  private base: HTMLDivElement;
  private knob: HTMLDivElement;
  private actionBtn: HTMLButtonElement;
  private jumpBtn: HTMLButtonElement;
  private cancelBtn: HTMLButtonElement;
  private stickId: number | null = null;
  private stickOrigin = { x: 0, y: 0 };
  private lookId: number | null = null;
  private lookLast = { x: 0, y: 0 };
  private actionAs: Action = 'fish';
  private actionHeld = false;
  private lastLabel = '';

  constructor(private input: Input) {
    this.root = document.createElement('div');
    this.root.id = 'touch';
    this.root.innerHTML = `
      <div class="t-zone"></div>
      <div class="t-stick hidden"><div class="t-knob"></div></div>
      <button class="t-btn t-cancel hidden" aria-label="Abbrechen">✕</button>
      <button class="t-btn t-jump" aria-label="Springen">⤒</button>
      <button class="t-btn t-action" aria-label="Aktion"><span class="t-icon">🎣</span><span class="t-label"></span></button>`;
    document.body.insertBefore(this.root, document.getElementById('ui'));
    this.base = this.root.querySelector('.t-stick') as HTMLDivElement;
    this.knob = this.root.querySelector('.t-knob') as HTMLDivElement;
    this.actionBtn = this.root.querySelector('.t-action') as HTMLButtonElement;
    this.jumpBtn = this.root.querySelector('.t-jump') as HTMLButtonElement;
    this.cancelBtn = this.root.querySelector('.t-cancel') as HTMLButtonElement;

    const zone = this.root.querySelector('.t-zone') as HTMLDivElement;
    zone.addEventListener('pointerdown', (e) => this.zoneDown(e));
    zone.addEventListener('pointermove', (e) => this.zoneMove(e));
    zone.addEventListener('pointerup', (e) => this.zoneUp(e));
    zone.addEventListener('pointercancel', (e) => this.zoneUp(e));

    this.hold(this.actionBtn, (down) => {
      if (down) this.actionHeld = true;
      this.input.setVirtual(this.actionAs, down);
      if (!down) {
        this.actionHeld = false;
        // release both in case the context changed while the finger was down
        this.input.setVirtual('fish', false);
        this.input.setVirtual('interact', false);
      }
    });
    this.hold(this.jumpBtn, (down) => this.input.setVirtual('jump', down));
    this.hold(this.cancelBtn, (down) => this.input.setVirtual('cancel', down));
    this.setVisible(this.input.device === 'touch');
    input.onDeviceChange((d) => this.setVisible(d === 'touch'));
  }

  private setVisible(on: boolean): void {
    this.root.classList.toggle('hidden', !on);
    document.body.classList.toggle('touch', on);
  }

  private hold(el: HTMLElement, fn: (down: boolean) => void): void {
    el.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      try {
        el.setPointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      el.classList.add('down');
      fn(true);
    });
    const up = (e: PointerEvent) => {
      e.preventDefault();
      el.classList.remove('down');
      fn(false);
    };
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    el.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  private zoneDown(e: PointerEvent): void {
    e.preventDefault();
    try {
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      /* synthetic or already-released pointer */
    }
    this.input.setDevice('touch');
    if (e.clientX < innerWidth * 0.45 && this.stickId === null) {
      this.stickId = e.pointerId;
      this.stickOrigin = { x: e.clientX, y: e.clientY };
      this.base.style.left = `${e.clientX}px`;
      this.base.style.top = `${e.clientY}px`;
      this.knob.style.transform = 'translate(-50%, -50%)';
      this.base.classList.remove('hidden');
    } else if (this.lookId === null) {
      this.lookId = e.pointerId;
      this.lookLast = { x: e.clientX, y: e.clientY };
    }
  }

  private zoneMove(e: PointerEvent): void {
    if (e.pointerId === this.stickId) {
      let dx = e.clientX - this.stickOrigin.x;
      let dy = e.clientY - this.stickOrigin.y;
      const len = Math.hypot(dx, dy);
      if (len > STICK_RADIUS) {
        dx = (dx / len) * STICK_RADIUS;
        dy = (dy / len) * STICK_RADIUS;
      }
      this.knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
      const v = { x: dx / STICK_RADIUS, y: -dy / STICK_RADIUS };
      const m = Math.hypot(v.x, v.y);
      const k = m < 0.15 ? 0 : Math.min(1, (m - 0.15) / 0.8) / m; // dead zone + full speed near the rim
      this.input.touchMove.set(v.x * k, v.y * k);
      this.input.setVirtual('sprint', m > 0.97);
    } else if (e.pointerId === this.lookId) {
      this.input.addTouchLook(e.clientX - this.lookLast.x, e.clientY - this.lookLast.y);
      this.lookLast = { x: e.clientX, y: e.clientY };
    }
  }

  private zoneUp(e: PointerEvent): void {
    if (e.pointerId === this.stickId) {
      this.stickId = null;
      this.input.touchMove.set(0, 0);
      this.input.setVirtual('sprint', false);
      this.base.classList.add('hidden');
    } else if (e.pointerId === this.lookId) this.lookId = null;
  }

  /** Update button labels/visibility from the game state (call every frame). */
  update(ctx: TouchContext): void {
    if (this.root.classList.contains('hidden')) return;
    this.root.classList.toggle('menu-open', ctx.menuOpen);
    let icon = '🎣';
    let label = '';
    let as: Action = 'fish';
    let hot = false;
    switch (ctx.fishing) {
      case 'charging': label = 'Loslassen = Werfen'; break;
      case 'flying': label = ''; break;
      case 'waiting': label = 'Einholen'; break;
      case 'bite': icon = '❗'; label = 'Anschlagen!'; hot = true; break;
      case 'reeling': label = 'Halten = Einholen'; hot = true; break;
      case 'landing': icon = '✔'; label = 'Weiter'; break;
      case 'retrieve': label = ''; break;
      default:
        if (ctx.prompt?.action === 'interact') {
          as = 'interact';
          icon = /verkauf|Laden|kauf/i.test(ctx.prompt.text) ? '🛒' : /Angel nehmen/.test(ctx.prompt.text) ? '✋' : '💬';
          label = ctx.prompt.text.replace(/\s*\(.*\)$/, '');
        } else if (ctx.prompt?.action === 'fish') label = 'Auswerfen';
    }
    if (!this.actionHeld) this.actionAs = as;
    const key = `${icon}|${label}|${hot}|${!ctx.prompt && ctx.fishing === 'idle'}`;
    if (key !== this.lastLabel) {
      this.lastLabel = key;
      (this.actionBtn.querySelector('.t-icon') as HTMLElement).textContent = icon;
      (this.actionBtn.querySelector('.t-label') as HTMLElement).textContent = label;
      this.actionBtn.classList.toggle('hot', hot);
      this.actionBtn.classList.toggle('idle', !ctx.prompt && ctx.fishing === 'idle');
    }
    const fishingActive = ['charging', 'waiting', 'bite', 'reeling'].includes(ctx.fishing);
    this.cancelBtn.classList.toggle('hidden', !fishingActive);
    this.jumpBtn.classList.toggle('hidden', ctx.fishing !== 'idle');
  }
}

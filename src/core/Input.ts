import * as THREE from 'three';

export type Device = 'keyboard' | 'gamepad';
export type Action =
  | 'jump' | 'interact' | 'fish' | 'cancel' | 'sprint'
  | 'up' | 'down' | 'left' | 'right' | 'confirm' | 'back';

interface Binding {
  keys: string[];
  pad: number[];
  mouse?: number[];
}

/** Keyboard + gamepad (standard mapping) bindings. Mouse is optional extra (left click fish, right-drag look). */
const BINDINGS: Record<Action, Binding> = {
  jump: { keys: ['Space'], pad: [0] },
  interact: { keys: ['KeyE'], pad: [2] },
  fish: { keys: ['KeyF'], pad: [7, 5], mouse: [0] },
  cancel: { keys: ['KeyQ'], pad: [1] },
  sprint: { keys: ['ShiftLeft', 'ShiftRight'], pad: [6, 10] },
  up: { keys: ['KeyW', 'ArrowUp'], pad: [12] },
  down: { keys: ['KeyS', 'ArrowDown'], pad: [13] },
  left: { keys: ['KeyA', 'ArrowLeft'], pad: [14] },
  right: { keys: ['KeyD', 'ArrowRight'], pad: [15] },
  confirm: { keys: ['Enter', 'KeyE', 'Space'], pad: [0] },
  back: { keys: ['Escape', 'KeyQ', 'Backspace'], pad: [1] },
};

const DEADZONE = 0.18;

function dz(v: number): number {
  return Math.abs(v) < DEADZONE ? 0 : (v - Math.sign(v) * DEADZONE) / (1 - DEADZONE);
}

export class Input {
  /** Movement (x = right, y = forward), length <= 1. */
  readonly move = new THREE.Vector2();
  /** Camera look rate (x = yaw right, y = pitch down), roughly -1..1 per axis. */
  readonly look = new THREE.Vector2();
  /** Mouse drag delta in pixels since last frame. */
  readonly mouseDelta = new THREE.Vector2();
  device: Device = 'keyboard';

  private keys = new Set<string>();
  /** Keys/buttons that went down since the last update — so quick taps are never missed at low frame rates. */
  private latched = new Set<string>();
  private mouseButtons = new Set<number>();
  private now = new Map<Action, boolean>();
  private prev = new Map<Action, boolean>();
  private listeners = new Set<(d: Device) => void>();

  constructor(target: HTMLElement) {
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Tab' || e.code === 'Space' || e.code.startsWith('Arrow')) e.preventDefault();
      if (!e.repeat) this.latched.add(e.code);
      this.keys.add(e.code);
      this.setDevice('keyboard');
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => {
      this.keys.clear();
      this.mouseButtons.clear();
    });
    target.addEventListener('mousedown', (e) => {
      this.mouseButtons.add(e.button);
      this.latched.add('mouse' + e.button);
      this.setDevice('keyboard');
    });
    window.addEventListener('mouseup', (e) => this.mouseButtons.delete(e.button));
    window.addEventListener('mousemove', (e) => {
      if (this.mouseButtons.has(2)) this.mouseDelta.x += e.movementX;
      if (this.mouseButtons.has(2)) this.mouseDelta.y += e.movementY;
    });
    target.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  onDeviceChange(fn: (d: Device) => void): void {
    this.listeners.add(fn);
  }

  private setDevice(d: Device): void {
    if (d !== this.device) {
      this.device = d;
      this.listeners.forEach((fn) => fn(d));
    }
  }

  private pad(): Gamepad | null {
    const pads = navigator.getGamepads?.() ?? [];
    for (const p of pads) if (p && p.connected) return p;
    return null;
  }

  /** Call once per frame before game systems read input. */
  update(): void {
    this.prev = new Map(this.now);
    const pad = this.pad();
    const padDown = (i: number) => !!pad && !!pad.buttons[i] && (pad.buttons[i].pressed || pad.buttons[i].value > 0.4);
    let padActive = false;

    for (const action of Object.keys(BINDINGS) as Action[]) {
      const b = BINDINGS[action];
      const k =
        b.keys.some((c) => this.keys.has(c) || this.latched.has(c)) ||
        (b.mouse ?? []).some((m) => this.mouseButtons.has(m) || this.latched.has('mouse' + m));
      const p = b.pad.some(padDown);
      if (p) padActive = true;
      this.now.set(action, k || p);
    }

    const kx = (this.keys.has('KeyD') ? 1 : 0) - (this.keys.has('KeyA') ? 1 : 0);
    const ky = (this.keys.has('KeyW') ? 1 : 0) - (this.keys.has('KeyS') ? 1 : 0);
    this.move.set(kx, ky);
    const lx = (this.keys.has('ArrowRight') ? 1 : 0) - (this.keys.has('ArrowLeft') ? 1 : 0);
    const ly = (this.keys.has('ArrowDown') ? 1 : 0) - (this.keys.has('ArrowUp') ? 1 : 0);
    this.look.set(lx, ly);

    if (pad) {
      const ax = dz(pad.axes[0] ?? 0);
      const ay = dz(pad.axes[1] ?? 0);
      const rx = dz(pad.axes[2] ?? 0);
      const ry = dz(pad.axes[3] ?? 0);
      if (ax || ay || rx || ry) padActive = true;
      this.move.x += ax;
      this.move.y -= ay;
      this.look.x += rx;
      this.look.y += ry;
    }
    if (this.move.lengthSq() > 1) this.move.normalize();
    this.latched.clear();
    if (padActive) this.setDevice('gamepad');
  }

  /** Call at the end of the frame. */
  endFrame(): void {
    this.mouseDelta.set(0, 0);
  }

  held(a: Action): boolean {
    return !!this.now.get(a);
  }

  pressed(a: Action): boolean {
    return !!this.now.get(a) && !this.prev.get(a);
  }

  released(a: Action): boolean {
    return !this.now.get(a) && !!this.prev.get(a);
  }

  /** Swallow an action until it is released (e.g. after closing a menu with the same key). */
  consume(a: Action): void {
    this.prev.set(a, true);
  }
}

import * as THREE from 'three';

export type Device = 'keyboard' | 'gamepad' | 'touch';

/** True on phones/tablets (coarse pointer, no hover). */
export const IS_TOUCH_DEVICE = typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches;
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

/** Keys that mean "someone is playing with a keyboard" (phone volume/media keys also send keydown). */
const GAME_KEYS = new Set(Object.values(BINDINGS).flatMap((b) => b.keys));

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
  device: Device = IS_TOUCH_DEVICE ? 'touch' : 'keyboard';
  /** Touch joystick vector (x = right, y = forward), set by TouchControls. */
  readonly touchMove = new THREE.Vector2();
  /** Pixel-to-camera factor for touch drags (relative to mouse drags). */
  touchLookScale = 1.5;
  /** Ignore all input (e.g. the phone is held upright). */
  paused = false;
  private virtualHeld = new Set<Action>();
  private virtualLatched = new Set<Action>();

  private keys = new Set<string>();
  /** Keys/buttons that went down since the last update — so quick taps are never missed at low frame rates. */
  private latched = new Set<string>();
  private mouseButtons = new Set<number>();
  private now = new Map<Action, boolean>();
  private prev = new Map<Action, boolean>();
  private listeners = new Set<(d: Device) => void>();
  /** Time of the last touch/pen contact — mobile browsers fire emulated mouse events after a tap. */
  private lastTouch = -Infinity;

  constructor(target: HTMLElement) {
    const noteTouch = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') this.lastTouch = performance.now();
    };
    window.addEventListener('pointerdown', noteTouch, { capture: true });
    window.addEventListener('pointerup', noteTouch, { capture: true });
    /** A real mouse event, not the compatibility mousedown a tap produces (e.g. on the canvas behind the start gate). */
    const realMouse = (e: MouseEvent) =>
      !(e as MouseEvent & { sourceCapabilities?: { firesTouchEvents?: boolean } }).sourceCapabilities?.firesTouchEvents &&
      performance.now() - this.lastTouch > 1000;
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Tab' || e.code === 'Space' || e.code.startsWith('Arrow')) e.preventDefault();
      if (!e.repeat) this.latched.add(e.code);
      this.keys.add(e.code);
      if (GAME_KEYS.has(e.code)) this.setDevice('keyboard'); // not on volume keys, on-screen keyboards / IME …
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => {
      this.keys.clear();
      this.mouseButtons.clear();
      this.virtualHeld.clear();
      this.touchMove.set(0, 0);
    });
    target.addEventListener('mousedown', (e) => {
      if (!realMouse(e)) return;
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

  /** On-screen touch buttons press/release game actions. */
  setVirtual(a: Action, down: boolean): void {
    if (down) {
      this.virtualHeld.add(a);
      this.virtualLatched.add(a);
      this.setDevice('touch');
    } else this.virtualHeld.delete(a);
  }

  /** Touch-drag camera look (pixels). */
  addTouchLook(dx: number, dy: number): void {
    this.mouseDelta.x += dx * this.touchLookScale;
    this.mouseDelta.y += dy * this.touchLookScale;
    this.setDevice('touch');
  }

  onDeviceChange(fn: (d: Device) => void): void {
    this.listeners.add(fn);
  }

  setDevice(d: Device): void {
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
      const v = this.virtualHeld.has(action) || this.virtualLatched.has(action);
      this.now.set(action, !this.paused && (k || p || v));
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
    this.move.add(this.touchMove);
    if (this.move.lengthSq() > 1) this.move.normalize();
    if (this.paused) {
      this.move.set(0, 0);
      this.look.set(0, 0);
    }
    this.latched.clear();
    this.virtualLatched.clear();
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

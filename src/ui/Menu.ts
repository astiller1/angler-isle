import type { Input } from '../core/Input';
import { glyph } from './glyphs';

export interface MenuOption {
  label: string;
  /** Disabled options are shown greyed out and cannot be picked. */
  disabled?: boolean;
  hint?: string;
}

export interface MenuSpec {
  title: string;
  subtitle?: string;
  text?: string;
  /** Optional image (e.g. fish icon) shown next to the text. */
  image?: string;
  options: MenuOption[];
  /** Index returned when the player backs out (default: last option). */
  backIndex?: number;
}

/**
 * Modal dialog / choice list, driven by keyboard or gamepad (up/down + confirm/back) or mouse.
 * `open()` resolves with the chosen index.
 */
export class Menu {
  private el: HTMLDivElement;
  private spec: MenuSpec | null = null;
  private index = 0;
  private resolve: ((i: number) => void) | null = null;
  private openedAt = 0;

  constructor(
    parent: HTMLElement,
    private input: Input,
  ) {
    this.el = document.createElement('div');
    this.el.className = 'menu hidden';
    parent.appendChild(this.el);
  }

  get isOpen(): boolean {
    return this.spec !== null;
  }

  open(spec: MenuSpec): Promise<number> {
    this.spec = spec;
    this.index = Math.max(0, spec.options.findIndex((o) => !o.disabled));
    this.openedAt = performance.now();
    this.render();
    this.el.classList.remove('hidden');
    return new Promise((res) => (this.resolve = res));
  }

  private close(i: number): void {
    this.el.classList.add('hidden');
    this.spec = null;
    // swallow the button so it does not trigger gameplay on the same frame
    this.input.consume('interact');
    this.input.consume('confirm');
    this.input.consume('jump');
    this.input.consume('fish');
    const r = this.resolve;
    this.resolve = null;
    r?.(i);
  }

  update(): void {
    const s = this.spec;
    if (!s) return;
    if (performance.now() - this.openedAt < 150) return;
    const inp = this.input;
    const n = s.options.length;
    const move = (d: number) => {
      for (let k = 1; k <= n; k++) {
        const j = (this.index + d * k + n * 4) % n;
        if (!s.options[j].disabled) {
          this.index = j;
          break;
        }
      }
      this.render();
    };
    if (inp.pressed('up')) move(-1);
    if (inp.pressed('down')) move(1);
    if (inp.pressed('confirm') && !s.options[this.index]?.disabled) this.close(this.index);
    else if (inp.pressed('back') || inp.pressed('cancel')) this.close(s.backIndex ?? n - 1);
  }

  private render(): void {
    const s = this.spec;
    if (!s) return;
    const img = s.image ? `<img class="menu-img" src="${s.image}" alt="">` : '';
    this.el.innerHTML = `
      <div class="panel">
        <div class="menu-title">${s.title}${s.subtitle ? `<span class="menu-sub">${s.subtitle}</span>` : ''}</div>
        ${s.text || img ? `<div class="menu-text">${img}<p>${s.text ?? ''}</p></div>` : ''}
        <ul class="menu-options">
          ${s.options
            .map(
              (o, i) => `<li data-i="${i}" class="${i === this.index ? 'sel' : ''} ${o.disabled ? 'off' : ''}">
                 ${o.label}${o.hint ? `<small>${o.hint}</small>` : ''}</li>`,
            )
            .join('')}
        </ul>
        <div class="menu-help">${glyph(this.input.device, 'confirm')} wählen · ${glyph(this.input.device, 'back')} zurück</div>
      </div>`;
    this.el.querySelectorAll('li').forEach((li) => {
      const i = Number((li as HTMLElement).dataset.i);
      li.addEventListener('mouseenter', () => {
        if (!this.spec?.options[i].disabled && this.index !== i) {
          this.index = i;
          this.render();
        }
      });
      li.addEventListener('click', () => !this.spec?.options[i].disabled && this.close(i));
    });
  }
}

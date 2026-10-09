import type { Game } from '../core/Game';
import type { Action } from '../core/Input';
import { fishById } from '../data/fish';
import { NEIGHBORS } from '../data/neighbors';
import { T, fmt, kg } from '../data/strings';
import { coolerCapacity } from '../inventory/Cooler';
import type { CaughtFish, GameState } from '../state/GameState';
import { glyph } from './glyphs';
import { Menu } from './Menu';

/** The DOM overlay: coins, round & requests, cooler slots, prompts, toasts, fishing gauges, catch card. */
export class Hud {
  readonly root: HTMLElement;
  readonly menu: Menu;
  private coinsEl: HTMLElement;
  private reqEl: HTMLElement;
  private coolerEl: HTMLElement;
  private promptEl: HTMLElement;
  private toastEl: HTMLElement;
  private helpEl: HTMLElement;
  private powerEl: HTMLElement;
  private tensionEl: HTMLElement;
  private biteEl: HTMLElement;
  private cardEl: HTMLElement;
  private spotEl: HTMLElement;
  private shownCoins = 0;
  private promptKey = '';

  constructor(
    private game: Game,
    private state: GameState,
    readonly icons: Map<string, string>,
  ) {
    const ui = document.getElementById('ui')!;
    ui.innerHTML = `
      <div class="hud-top-left">
        <div class="badge round"><span class="round-num"></span></div>
        <div class="requests panel small"></div>
      </div>
      <div class="hud-top-right"><div class="badge coins"><span class="coin-icon">●</span><span class="coin-num">0</span></div></div>
      <div class="spot-name hidden"></div>
      <div class="toasts"></div>
      <div class="cooler-bar"></div>
      <div class="prompt hidden"></div>
      <div class="help"></div>
      <div class="power hidden"><div class="power-fill"></div></div>
      <div class="tension hidden">
        <div class="tension-label"></div>
        <div class="tension-bar"><div class="tension-danger"></div><div class="tension-fill"></div></div>
        <div class="line-bar"><div class="line-fill"></div><span class="line-fish">🐟</span></div>
      </div>
      <div class="bite hidden">!</div>
      <div class="catch-card hidden"></div>`;
    this.root = ui;
    const q = (s: string) => ui.querySelector(s) as HTMLElement;
    this.coinsEl = q('.coin-num');
    this.reqEl = q('.requests');
    this.coolerEl = q('.cooler-bar');
    this.promptEl = q('.prompt');
    this.toastEl = q('.toasts');
    this.helpEl = q('.help');
    this.powerEl = q('.power');
    this.tensionEl = q('.tension');
    this.biteEl = q('.bite');
    this.cardEl = q('.catch-card');
    this.spotEl = q('.spot-name');
    this.menu = new Menu(ui, game.input);
    this.shownCoins = state.coins;
    this.coinsEl.textContent = String(state.coins);

    game.events.on('cooler:changed', () => this.renderCooler());
    game.events.on('coins:changed', ({ delta }) => {
      if (delta > 0) this.toast(fmt(T.coinsGained, { coins: delta }), 'good');
      this.coinsEl.parentElement!.classList.remove('pop');
      void this.coinsEl.offsetWidth;
      this.coinsEl.parentElement!.classList.add('pop');
      this.renderRequests();
    });
    game.events.on('round:started', () => this.renderRequests());
    game.events.on('request:delivered', () => this.renderRequests());
    game.events.on('toast', ({ text, kind }) => this.toast(text, kind));
    game.input.onDeviceChange(() => {
      this.renderHelp();
      this.promptKey = '';
    });
    this.renderAll();
  }

  renderAll(): void {
    this.renderRequests();
    this.renderCooler();
    this.renderHelp();
  }

  icon(fishId: string): string {
    return this.icons.get(fishId) ?? '';
  }

  renderRequests(): void {
    (this.root.querySelector('.round-num') as HTMLElement).textContent = `${T.round} ${Math.max(1, this.state.round)}`;
    const rows = NEIGHBORS.map((n) => {
      const r = this.state.requests[n.id];
      if (!r) return '';
      const f = fishById(r.fishId);
      const have = this.state.cooler.some((c) => c.fishId === r.fishId);
      return `<div class="req ${r.delivered ? 'done' : ''} ${have && !r.delivered ? 'have' : ''}">
        <img src="${this.icon(f.id)}" alt=""><div><b>${n.name}</b><span>${f.name}</span></div>
        <em>${r.delivered ? '✔' : `${r.reward} ●`}</em></div>`;
    }).join('');
    this.reqEl.innerHTML = `<div class="req-title">${T.requests}</div>${rows}`;
  }

  renderCooler(): void {
    const cap = coolerCapacity(this.state);
    let html = `<div class="cooler-label">${T.cooler} ${this.state.cooler.length}/${cap}</div><div class="slots">`;
    for (let i = 0; i < cap; i++) {
      const f: CaughtFish | undefined = this.state.cooler[i];
      html += f
        ? `<div class="slot full" title="${fishById(f.fishId).name}"><img src="${this.icon(f.fishId)}" alt=""><small>${kg(f.weight)}</small></div>`
        : `<div class="slot"></div>`;
    }
    this.coolerEl.innerHTML = html + '</div>';
    this.coolerEl.classList.toggle('full', this.state.cooler.length >= cap);
    this.renderRequests();
  }

  renderHelp(): void {
    this.helpEl.textContent = this.game.input.device === 'gamepad' ? T.controlsGamepad : T.controlsKeyboard;
  }

  /** Show "[E] Reden" style prompt; null hides it. */
  prompt(action: Action | null, text = ''): void {
    const key = action ? `${action}|${text}|${this.game.input.device}` : '';
    if (key === this.promptKey) return;
    this.promptKey = key;
    if (!action) {
      this.promptEl.classList.add('hidden');
      return;
    }
    this.promptEl.innerHTML = `${glyph(this.game.input.device, action)} ${text}`;
    this.promptEl.classList.remove('hidden');
  }

  toast(text: string, kind: 'info' | 'good' | 'warn' = 'info'): void {
    const el = document.createElement('div');
    el.className = `toast ${kind}`;
    el.textContent = text;
    this.toastEl.appendChild(el);
    setTimeout(() => el.classList.add('out'), 2600);
    setTimeout(() => el.remove(), 3200);
    while (this.toastEl.children.length > 4) this.toastEl.firstChild?.remove();
  }

  spotName(name: string | null): void {
    if (!name) {
      this.spotEl.classList.add('hidden');
      return;
    }
    this.spotEl.textContent = fmt(T.spotEntered, { name });
    this.spotEl.classList.remove('hidden');
  }

  power(v: number | null): void {
    this.powerEl.classList.toggle('hidden', v === null);
    if (v !== null) (this.powerEl.firstElementChild as HTMLElement).style.height = `${Math.round(v * 100)}%`;
  }

  tension(t: { tension: number; limit: number; distance: number; label: string } | null): void {
    this.tensionEl.classList.toggle('hidden', !t);
    if (!t) return;
    const max = t.limit * 1.25;
    const fill = this.tensionEl.querySelector('.tension-fill') as HTMLElement;
    fill.style.width = `${Math.min(100, (t.tension / max) * 100)}%`;
    fill.classList.toggle('hot', t.tension > t.limit * 0.8);
    (this.tensionEl.querySelector('.tension-danger') as HTMLElement).style.left = `${(t.limit * 0.8 / max) * 100}%`;
    (this.tensionEl.querySelector('.line-fill') as HTMLElement).style.width = `${(1 - t.distance) * 100}%`;
    (this.tensionEl.querySelector('.line-fish') as HTMLElement).style.left = `calc(${(1 - t.distance) * 100}% - 10px)`;
    (this.tensionEl.querySelector('.tension-label') as HTMLElement).innerHTML = t.label;
  }

  bite(on: boolean): void {
    this.biteEl.classList.toggle('hidden', !on);
  }

  catchCard(fish: CaughtFish | null, isNew = false): void {
    if (!fish) {
      this.cardEl.classList.add('hidden');
      return;
    }
    const f = fishById(fish.fishId);
    this.cardEl.innerHTML = `
      <div class="card-head">${T.caught}${isNew ? `<span class="new">${T.newSpecies}</span>` : ''}</div>
      <img src="${this.icon(f.id)}" alt="">
      <div class="card-name">${f.name}</div>
      <div class="card-meta"><span class="rarity ${f.rarity}">${T.rarity[f.rarity]}</span> · ${kg(fish.weight)} · ${fish.value} ●</div>
      <div class="card-desc">${f.description}</div>`;
    this.cardEl.classList.remove('hidden');
  }

  update(): void {
    // animated coin counter
    if (this.shownCoins !== this.state.coins) {
      const d = this.state.coins - this.shownCoins;
      this.shownCoins += Math.sign(d) * Math.max(1, Math.round(Math.abs(d) * 0.15));
      this.coinsEl.textContent = String(this.shownCoins);
    }
    this.menu.update();
  }
}

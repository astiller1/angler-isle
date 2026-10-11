import type { Game } from '../core/Game';
import { T, fmt } from '../data/strings';
import { musicCredits } from '../data/music';
import type { Hud } from './Hud';

export interface PauseActions {
  isMuted(): boolean;
  toggleMusic(): void;
  backToHarbor(): void;
  restart(): void;
  /** Only open when this returns true (e.g. not in the middle of a fishing fight). */
  canOpen(): boolean;
}

/** The game menu (☰ button / Esc / gamepad Start): resume, music, back to the harbor, controls, new game. */
export class PauseMenu {
  isOpen = false;

  constructor(
    private game: Game,
    private hud: Hud,
    private actions: PauseActions,
  ) {
    hud.onMenuButton = () => this.open();
  }

  /** Call every frame: opens on Esc / Start. */
  update(): void {
    if (this.game.input.pressed('menu')) this.open();
  }

  async open(): Promise<void> {
    if (this.isOpen || this.hud.menu.isOpen || !this.actions.canOpen()) return;
    this.isOpen = true;
    try {
      for (;;) {
        const options = [
          { label: T.menuResume },
          { label: this.actions.isMuted() ? T.menuMusicOff : T.menuMusicOn },
          { label: T.menuHarbor, hint: T.menuHarborHint },
          { label: T.menuControls },
          { label: T.menuRestart, hint: T.menuRestartHint },
        ];
        const credits = `<small>${fmt(T.musicCredit, { credits: musicCredits() })}</small>`;
        const choice = await this.hud.menu.open({ title: T.menuTitle, text: credits, options, backIndex: 0 });
        if (choice === 1) {
          this.actions.toggleMusic();
          continue;
        }
        if (choice === 2) {
          this.actions.backToHarbor();
          this.hud.toast(T.backToHarbor, 'info');
        } else if (choice === 3) {
          const d = this.game.input.device;
          const text = d === 'gamepad' ? T.controlsGamepad : d === 'touch' ? T.controlsTouch : T.controlsKeyboard;
          await this.hud.menu.open({ title: T.menuControls, text: text.replace(/ · /g, '<br>'), options: [{ label: '↩ Zurück' }] });
          continue;
        } else if (choice === 4) {
          const ok = await this.hud.menu.open({
            title: T.restartTitle,
            text: T.restartText,
            options: [{ label: T.restartNo }, { label: T.restartYes }],
            backIndex: 0,
          });
          if (ok === 1) this.actions.restart();
          else continue;
        }
        return;
      }
    } finally {
      this.isOpen = false;
    }
  }
}

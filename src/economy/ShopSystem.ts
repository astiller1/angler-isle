import type { Game } from '../core/Game';
import { T, fmt } from '../data/strings';
import { BOAT, rodTier, type RodTier } from '../data/upgrades';
import type { InteractionSystem } from '../interaction/Interaction';
import type { Neighbors, Npc } from '../npc/Neighbors';
import type { Player } from '../player/Player';
import type { GameState } from '../state/GameState';
import type { Hud } from '../ui/Hud';
import type { MenuOption } from '../ui/Menu';
import { boatOffers, buyGear, buyNextRod, rodOffers, type GearOffer } from './shop';

/**
 * Rocco's tackle shop in the shack: rod upgrades (tier by tier), the rowboat and its outboard motor.
 * Coolers and bait (data already in data/upgrades.ts) will be added to this menu later.
 */
export class ShopSystem {
  private npc: Npc;

  constructor(
    private game: Game,
    private neighbors: Neighbors,
    private player: Player,
    private hud: Hud,
    private state: GameState,
    interaction: InteractionSystem,
  ) {
    this.npc = neighbors.spawn('rocco', 'Rocco', 'characters/raccoon', { anchor: 'ANCHOR_shopkeeper' }, 'stand');
    interaction.add({
      id: 'shop',
      position: this.npc.pos,
      radius: 3.2,
      label: () => T.shop,
      interact: () => this.open(),
    });
  }

  private stats(rod: RodTier): string {
    return fmt(T.shopStats, { cast: rod.castMax, tension: Math.round(rod.tensionLimit * 100), reel: Math.round(rod.reelSpeed * 100) });
  }

  private gearOption(g: GearOffer): MenuOption {
    const label = fmt(T.shopGear, { name: g.name, price: g.price });
    const desc = g.id === 'boat' ? BOAT.description : BOAT.motor.description;
    switch (g.status) {
      case 'owned':
        return { label: `✔ ${g.name}`, hint: T.shopOwnedHint, disabled: true };
      case 'buyable':
        return { label, hint: desc };
      case 'tooExpensive':
        return { label, hint: `${fmt(T.shopMissing, { coins: g.missing })} · ${desc}`, disabled: true };
      case 'locked':
        return { label, hint: fmt(T.shopGearLocked, { name: g.requires }), disabled: true };
    }
  }

  /** Open Rocco's shop menu (also from the rod display rack). */
  async open(): Promise<void> {
    this.player.lock('dialog', true);
    this.npc.talking = true;
    try {
      for (;;) {
        const current = rodTier(this.state.rodTier);
        const offers = rodOffers(this.state);
        const options: MenuOption[] = offers.map((o) => {
          switch (o.status) {
            case 'owned':
              return { label: fmt(T.shopOwned, { rod: o.rod.name }), hint: T.shopOwnedHint, disabled: true };
            case 'buyable':
              return { label: fmt(T.shopBuy, { rod: o.rod.name, price: o.rod.price }), hint: `${this.stats(o.rod)} — ${o.rod.description}` };
            case 'tooExpensive':
              return { label: fmt(T.shopBuy, { rod: o.rod.name, price: o.rod.price }), hint: `${fmt(T.shopMissing, { coins: o.missing })} · ${this.stats(o.rod)}`, disabled: true };
            case 'locked':
              return { label: fmt(T.shopBuy, { rod: o.rod.name, price: o.rod.price }), hint: fmt(T.shopLocked, { rod: o.requires.name }), disabled: true };
          }
        });
        const gear = boatOffers(this.state);
        options.push(...gear.map((g) => this.gearOption(g)));
        options.push({ label: T.leave });
        const maxed = offers.every((o) => o.status === 'owned');
        const text = !this.state.hasRod ? T.noRod : maxed ? T.shopMax : `${fmt(T.shopGreet, { rod: current.name })}<br><small>${this.stats(current)}</small>`;
        const choice = await this.hud.menu.open({ title: T.shopTitle, text, options });
        if (choice >= offers.length && choice < offers.length + gear.length) {
          const g = gear[choice - offers.length];
          if (g.status !== 'buyable' || !buyGear(this.state, g.id)) return;
          this.neighbors.celebrate(this.npc);
          this.game.events.emit('coins:changed', { coins: this.state.coins, delta: -g.price });
          this.game.events.emit('gear:bought', { id: g.id });
          this.hud.toast(fmt(T.gearBought, { name: g.name }), 'good');
          await this.hud.menu.open({ title: T.shopTitle, text: g.id === 'boat' ? T.boatBought : T.motorBought, options: [{ label: 'Weiter' }] });
          continue;
        }
        if (choice >= offers.length || offers[choice].status !== 'buyable') return;

        const rod = buyNextRod(this.state);
        if (!rod) return;
        this.player.giveRod(this.game.assets.get(rod.model));
        this.neighbors.celebrate(this.npc);
        this.game.events.emit('coins:changed', { coins: this.state.coins, delta: -rod.price });
        this.game.events.emit('rod:upgraded', { tier: rod.tier });
        this.hud.toast(fmt(T.rodUpgraded, { rod: rod.name }), 'good');
        await this.hud.menu.open({ title: T.shopTitle, text: fmt(T.shopThanks, { rod: rod.name }), options: [{ label: 'Weiter' }] });
      }
    } finally {
      this.npc.talking = false;
      this.player.lock('dialog', false);
    }
  }
}

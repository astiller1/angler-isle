import type { CaughtFish } from '../state/GameState';

/** All game events and their payloads. Add new events here so every listener stays typed. */
export interface GameEvents {
  'rod:taken': void;
  'rod:upgraded': { tier: number };
  'fish:caught': { fish: CaughtFish; spotId: string };
  'fish:escaped': { fishId: string | null; reason: 'snap' | 'slack' | 'missed' };
  'fish:released': { fish: CaughtFish };
  'fish:sold': { fish: CaughtFish; coins: number };
  'cooler:changed': void;
  'coins:changed': { coins: number; delta: number };
  'request:delivered': { neighborId: string; fish: CaughtFish; coins: number };
  'round:started': { round: number };
  'toast': { text: string; kind?: 'info' | 'good' | 'warn' };
}

type Handler<T> = (payload: T) => void;

export class EventBus {
  private handlers = new Map<keyof GameEvents, Set<Handler<never>>>();

  on<K extends keyof GameEvents>(type: K, fn: Handler<GameEvents[K]>): () => void {
    let set = this.handlers.get(type);
    if (!set) this.handlers.set(type, (set = new Set()));
    set.add(fn as Handler<never>);
    return () => set!.delete(fn as Handler<never>);
  }

  emit<K extends keyof GameEvents>(type: K, ...payload: GameEvents[K] extends void ? [] : [GameEvents[K]]): void {
    this.handlers.get(type)?.forEach((fn) => (fn as Handler<unknown>)(payload[0]));
  }
}

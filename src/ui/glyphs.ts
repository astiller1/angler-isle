import type { Action, Device } from '../core/Input';

const KEY: Partial<Record<Action, string>> = {
  interact: 'E', fish: 'F', cancel: 'Q', jump: 'Leertaste', confirm: 'E', back: 'Esc', sprint: 'Shift',
};
const PAD: Partial<Record<Action, string>> = {
  interact: 'X', fish: 'RT', cancel: 'B', jump: 'A', confirm: 'A', back: 'B', sprint: 'LT',
};

/** Button label as a little key cap, matching the last used device. */
export function glyph(device: Device, action: Action): string {
  const label = (device === 'gamepad' ? PAD : KEY)[action] ?? action;
  return `<kbd class="${device === 'gamepad' ? 'pad pad-' + label : ''}">${label}</kbd>`;
}

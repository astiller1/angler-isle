import type { Action, Device } from '../core/Input';

const KEY: Partial<Record<Action, string>> = {
  interact: 'E', fish: 'F', cancel: 'Q', jump: 'Leertaste', confirm: 'E', back: 'Esc', sprint: 'Shift', menu: 'Esc', map: 'K',
};
const PAD: Partial<Record<Action, string>> = {
  interact: 'X', fish: 'RT', cancel: 'B', jump: 'A', confirm: 'A', back: 'B', sprint: 'LT', menu: 'Start', map: 'Select',
};

const TOUCH: Partial<Record<Action, string>> = {
  interact: '💬', fish: '🎣', cancel: '✕', jump: '⤒', confirm: 'Tippen', back: '✕', sprint: '', map: '🗺',
};

/** Button label as a little key cap, matching the last used device. */
export function glyph(device: Device, action: Action): string {
  if (device === 'touch') return `<kbd class="touch">${TOUCH[action] ?? action}</kbd>`;
  const label = (device === 'gamepad' ? PAD : KEY)[action] ?? action;
  return `<kbd class="${device === 'gamepad' ? 'pad pad-' + label : ''}">${label}</kbd>`;
}

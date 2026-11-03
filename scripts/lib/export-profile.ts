export type ExportAction =
  { kind: 'tap'; x: number; y: number; pauseMs: number } |
  { kind: 'swipe'; x: number; y: number; endX: number; endY: number; durationMs: number; pauseMs: number } |
  { kind: 'back'; pauseMs: number };
export interface ExportProfile {
  version: 1; width: number; height: number; launchWaitMs: number;
  playerTag?: string; actions: ExportAction[];
}
export function validateProfile(value: unknown): ExportProfile {
  if (!value || typeof value !== 'object') throw new Error('Expected an Android export profile.');
  const p = value as ExportProfile;
  const integer = (number: number, min: number, max: number) => Number.isInteger(number) && number >= min && number <= max;
  if (p.version !== 1 || !integer(p.width, 200, 10000) || !integer(p.height, 200, 10000) || !integer(p.launchWaitMs, 500, 30000)) throw new Error('Invalid profile version, screen dimensions or launch wait.');
  if (p.playerTag && !/^#[A-Z0-9]{3,20}$/i.test(p.playerTag)) throw new Error('Invalid expected player tag.');
  if (!Array.isArray(p.actions) || !p.actions.length || p.actions.length > 24) throw new Error('An export profile needs 1–24 menu actions.');
  for (const action of p.actions) {
    if (!['tap', 'swipe', 'back'].includes(action.kind) || !integer(action.pauseMs, 100, 10000)) throw new Error('Invalid menu action or pause.');
    if (action.kind !== 'back' && (!integer(action.x, 0, p.width - 1) || !integer(action.y, 0, p.height - 1))) throw new Error('A menu tap is outside the calibrated screen.');
    if (action.kind === 'swipe' && (!integer(action.endX, 0, p.width - 1) || !integer(action.endY, 0, p.height - 1) || !integer(action.durationMs, 100, 3000))) throw new Error('Invalid swipe coordinates or duration.');
  }
  return { ...p, playerTag: p.playerTag?.toUpperCase() };
}

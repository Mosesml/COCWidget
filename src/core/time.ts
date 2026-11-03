import type { Entity, Lane, Snapshot } from './types';

export function laneFor(entity: Entity): Lane | null {
  if (['equipment', 'helper', 'skin', 'scenery', 'decoration', 'obstacle', 'housePart', 'unknown'].includes(entity.kind)) return null;
  if (entity.village === 'builder') return entity.kind === 'troop' ? 'starLab' : 'builderBase';
  if (entity.kind === 'pet') return 'pet';
  if (entity.kind === 'troop' || entity.kind === 'spell') return 'lab';
  return 'builder';
}
const seconds = (snapshot: Snapshot, key: string) => typeof snapshot.boosts[key] === 'number' ? Math.max(0, snapshot.boosts[key] as number) : 0;
function intervals(snapshot: Snapshot, entity: Entity) {
  const lane = laneFor(entity);
  const rates: { start: number; end: number; rate: number; additive: boolean }[] = [];
  const boost = (key: string, rate: number, additive = false) => {
    if (seconds(snapshot, key)) rates.push({ start: snapshot.exportedAt, end: snapshot.exportedAt + seconds(snapshot, key) * 1000, rate, additive });
  };
  if (lane === 'builder') { boost('builder_boost', 10); boost('builder_consumable', 2); }
  if (lane === 'lab') { boost('lab_boost', 24); boost('lab_consumable', 3, true); }
  if (lane === 'pet') { boost('pet_boost', 24); boost('lab_consumable', 3, true); }
  if (lane === 'builderBase' || lane === 'starLab') boost('clocktower_boost', 10);
  if (entity.helperTimer && !entity.extra && (lane === 'builder' || lane === 'lab')) {
    const helper = snapshot.entities.find(e => e.id === (lane === 'builder' ? 93000000 : 93000001));
    if (helper?.level) rates.push({ start: snapshot.exportedAt, end: snapshot.exportedAt + entity.helperTimer * 1000, rate: helper.level, additive: true });
  }
  return rates;
}
function rateAt(rates: ReturnType<typeof intervals>, time: number) {
  const active = rates.filter(r => r.start <= time && r.end > time);
  return Math.max(1, ...active.filter(r => !r.additive).map(r => r.rate)) + active.filter(r => r.additive).reduce((sum, r) => sum + r.rate, 0);
}
function consumed(rates: ReturnType<typeof intervals>, start: number, end: number) {
  const boundaries = [start, ...rates.flatMap(r => [r.start, r.end]).filter(t => t > start && t < end), end].sort((a, b) => a - b);
  let result = 0;
  for (let i = 0; i < boundaries.length - 1; i++) result += (boundaries[i + 1]! - boundaries[i]!) / 1000 * rateAt(rates, boundaries[i]!);
  return result;
}
function finish(rates: ReturnType<typeof intervals>, work: number, start: number) {
  const boundaries = [...new Set(rates.flatMap(r => [r.start, r.end]).filter(t => t > start))].sort((a, b) => a - b);
  let cursor = start;
  for (const end of [...boundaries, Number.POSITIVE_INFINITY]) {
    const rate = rateAt(rates, cursor), possible = (end - cursor) / 1000 * rate;
    if (work <= possible) return cursor + work / rate * 1000;
    work -= possible; cursor = end;
  }
  return cursor;
}
export const finishAt = (snapshot: Snapshot, entity: Entity) => entity.timer === undefined ? null : finish(intervals(snapshot, entity), entity.timer, snapshot.exportedAt);
export function running(snapshot: Snapshot, now: number) {
  return snapshot.entities.filter(e => e.timer !== undefined).map(entity => ({
    entity, end: finishAt(snapshot, entity)!, lane: laneFor(entity),
  })).sort((a, b) => a.end - b.end).map(row => ({ ...row, ready: row.end <= now }));
}
export function compareMagicItem(snapshot: Snapshot, now: number, type: 'builderPotion' | 'researchPotion' | 'bookBuilding' | 'bookHeroes') {
  const savings: { name: string; seconds: number }[] = [];
  for (const entity of snapshot.entities) {
    if (entity.timer === undefined) continue;
    const lane = laneFor(entity), rates = intervals(snapshot, entity);
    const oldEnd = finishAt(snapshot, entity)!;
    if (oldEnd <= now) continue;
    if (type === 'bookBuilding' && lane === 'builder' && entity.kind !== 'hero') savings.push({ name: entity.name, seconds: (oldEnd - now) / 1000 });
    if (type === 'bookHeroes' && entity.kind === 'hero' && entity.village === 'home') savings.push({ name: entity.name, seconds: (oldEnd - now) / 1000 });
    if ((type === 'builderPotion' && lane === 'builder') || (type === 'researchPotion' && lane === 'lab')) {
      const rate = type === 'builderPotion' ? 10 : 24;
      const oldBoost = rates.filter(r => !r.additive && r.rate === rate).reduce((max, r) => Math.max(max, r.end), now);
      const remaining = Math.max(0, entity.timer - consumed(rates, snapshot.exportedAt, now));
      const projected = finish([...rates, { start: now, end: Math.max(now, oldBoost) + 3600000, rate, additive: false }], remaining, now);
      savings.push({ name: entity.name, seconds: Math.max(0, (oldEnd - projected) / 1000) });
    }
  }
  savings.sort((a, b) => b.seconds - a.seconds);
  return { savings, totalSeconds: type.startsWith('book') ? savings[0]?.seconds ?? 0 : savings.reduce((sum, x) => sum + x.seconds, 0),
    measure: type.startsWith('book') ? 'time on the best eligible upgrade' : 'summed worker time across eligible upgrades' };
}
export function duration(seconds: number, precise = false): string {
  if (!Number.isFinite(seconds)) return 'Unknown';
  if (seconds <= 0) return 'Ready';
  const minutes = Math.max(1, Math.ceil(seconds / 60));
  const days = Math.floor(minutes / 1440), hours = Math.floor(minutes % 1440 / 60), mins = minutes % 60;
  if (days) return `${days}d${hours ? ` ${hours}h` : ''}`;
  if (hours) return `${hours}h${mins ? ` ${mins}m` : ''}`;
  return precise && seconds < 60 ? `${Math.ceil(seconds)}s` : `${minutes}m`;
}
export function compact(value: number): string {
  return new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
}
export function nextOnline(time: number, start: number, end: number): number {
  if (start === end) return time;
  const date = new Date(time), hour = date.getHours() + date.getMinutes() / 60;
  const isOnline = start < end ? hour >= start && hour < end : hour >= start || hour < end;
  if (isOnline) return time;
  if (start < end && hour >= end) date.setDate(date.getDate() + 1);
  date.setHours(start, 0, 0, 0);
  return date.getTime();
}

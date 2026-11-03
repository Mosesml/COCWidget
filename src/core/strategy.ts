import { capacity, currentLevel, hallCap, levelAt, lookup } from './catalogue';
import { laneFor, nextOnline, running } from './time';
import type { Candidate, CatalogueItem, Cost, Entity, Lane, Plan, Preferences, Snapshot } from './types';

export const armies = [
  { id: 'dragons', name: 'Dragon pressure', shortName: 'Dragons', description: 'Build around Dragons, Balloons, air support and a strong Warden.',
    ids: [4000008, 4000005, 26000002, 26000005, 28000001, 28000002, 73000008, 90000022, 90000024],
    names: ['Dragon', 'Balloon', 'Rage Spell', 'Freeze Spell', 'Archer Queen', 'Grand Warden', 'Phoenix', 'Eternal Tome', 'Rage Gem'] },
  { id: 'hybrid', name: 'Queen charge hybrid', shortName: 'Hybrid', description: 'Support a Queen charge with Healers, Miners and Hog Riders.',
    ids: [4000007, 4000024, 4000011, 26000001, 26000002, 28000001, 28000004, 73000007, 90000014, 90000034],
    names: ['Healer', 'Miner', 'Hog Rider', 'Healing Spell', 'Rage Spell', 'Archer Queen', 'Royal Champion', 'Unicorn', 'Magic Mirror', 'Electro Boots'] },
  { id: 'smash', name: 'Ground smash', shortName: 'Smash', description: 'Prioritize a durable ground army, core heroes and support spells.',
    ids: [4000095, 4000053, 4000009, 26000002, 26000005, 28000000, 28000002, 73000010, 90000004, 90000022],
    names: ['Electro Titan', 'Yeti', 'P.E.K.K.A', 'Rage Spell', 'Freeze Spell', 'Barbarian King', 'Grand Warden', 'Diggy', 'Earthquake Boots', 'Eternal Tome'] },
] as const;
export const armyFor = (id: string) => armies.find(army => army.id === id) ?? armies[0];
export function warDeadline(value: string): number {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return NaN;
  const date = new Date(`${value}T00:00:00`);
  const [year, month, day] = value.split('-').map(Number);
  return date.getFullYear() === year && date.getMonth() === month! - 1 && date.getDate() === day ? date.getTime() : NaN;
}
export function relevant(item: CatalogueItem, preferences: Preferences) {
  return armyFor(preferences.armyId).names.some(name => name.toLowerCase() === item.name.toLowerCase());
}
export function blockersFor(item: CatalogueItem, target: number, snapshot: Snapshot) {
  const row = levelAt(item, target);
  if (!row) return ['No catalogue data for this level'];
  const blockers: string[] = [];
  const hall = item.village === 'builder' ? snapshot.builderHall : snapshot.townHall;
  if (row.requirements.townHall > hall) blockers.push(`${item.village === 'builder' ? 'Builder Hall' : 'Town Hall'} ${row.requirements.townHall}`);
  for (const [key, label] of [['lab', item.village === 'builder' ? 'Star Laboratory' : 'Laboratory'], ['heroHall', 'Hero Hall'], ['petHouse', 'Pet House'], ['blacksmith', 'Blacksmith']] as const) {
    if ((row.requirements[key] ?? 0) > capacity(snapshot, key, item.village)) blockers.push(`${label} ${row.requirements[key]}`);
  }
  if (row.mergeRequirement) blockers.push('Merged-building requirements need manual verification');
  return blockers;
}
export function recommendations(snapshot: Snapshot, preferences: Preferences, now: number): Candidate[] {
  const output: Candidate[] = [];
  for (const entity of snapshot.entities) {
    if (entity.parentKey || entity.timer !== undefined || entity.level === null || entity.supercharge !== undefined && entity.supercharge > 0) continue;
    if ([1000001, 1000034, 1000010, 1000033, 1000015, 1000064].includes(entity.id)) continue;
    const item = lookup(entity.id), lane = laneFor(entity);
    if (!item || item.seasonal || item.superTroop || !lane || !item.levels.length) continue;
    const current = levelAt(item, entity.level), target = levelAt(item, entity.level + 1);
    const hall = entity.village === 'builder' ? snapshot.builderHall : snapshot.townHall;
    if (!current || !target || entity.level >= hallCap(item, hall)) continue;
    if (current.secondsToNext === null || current.secondsToNext <= 0) continue;
    const discount = 1 - preferences.discount / 100;
    const cost = Object.fromEntries(Object.entries(current.costToNext).map(([key, value]) => [key, Math.floor(value * discount)]));
    const seconds = Math.ceil(current.secondsToNext * discount);
    const blockers = blockersFor(item, entity.level + 1, snapshot);
    if (entity.kind === 'hero' && entity.village === 'home' && preferences.protectHeroes && (preferences.goal === 'war' || preferences.warDate)) {
      const deadline = warDeadline(preferences.warDate);
      if (!Number.isFinite(deadline)) blockers.push('Set a valid war deadline or disable hero protection');
      else if (now + seconds * 1000 > deadline) blockers.push('This hero cannot finish before the protected war deadline');
    }
    const reasons: string[] = [];
    const onArmy = relevant(item, preferences);
    let score = 20;
    if (onArmy) { score += preferences.goal === 'army' || preferences.goal === 'war' ? 80 : 30; reasons.push(`Supports your ${armyFor(preferences.armyId).shortName} goal`); }
    if (['Army Camp', 'Clan Castle', 'Laboratory', 'Hero Hall', 'Pet House', 'Blacksmith'].includes(item.name)) { score += 65; reasons.push('Unlocks or supports other useful upgrades'); }
    if (entity.kind === 'hero') { score += 30; reasons.push('Strengthens a core hero'); }
    if (preferences.goal === 'max') { score += 40 * (1 - entity.level / Math.max(1, hallCap(item, hall))); reasons.push('Closes a gap at your current Hall level'); }
    if (entity.village === 'builder') score -= 20;
    score += 10 / Math.sqrt(seconds / 86400 + 0.1);
    if (blockers.length) score -= 40;
    if (!reasons.length) reasons.push('Makes steady progress on your current village');
    output.push({ key: `${entity.key}:${entity.level + 1}`, entity, item, from: entity.level, to: entity.level + 1,
      seconds, cost, lane, score, reasons, blockers });
  }
  return output.sort((a, b) => b.score - a.score || a.seconds - b.seconds || a.key.localeCompare(b.key));
}
export function armyReadiness(snapshot: Snapshot, preferences: Preferences) {
  return armyFor(preferences.armyId).names.map(name => {
    const item = [...new Set(snapshot.entities.map(e => e.id))].map(lookup).find(item => item?.name.toLowerCase() === name.toLowerCase());
    if (!item) return { name, current: null, target: null, progress: null, item: undefined };
    const current = currentLevel(snapshot, item.id), target = hallCap(item, snapshot.townHall);
    return { name, current, target, progress: target ? Math.min(1, current / target) : 0, item };
  });
}
const requirementIds: Record<string, number> = { lab: 1000007, heroHall: 1000071, petHouse: 1000068, blacksmith: 1000070 };
export function schedule(snapshot: Snapshot, preferences: Preferences, queue: Candidate[], now: number): Plan {
  const slots: Record<Lane, number[]> = { builder: Array(preferences.builders).fill(now), lab: [now], pet: [now],
    builderBase: Array(preferences.builderBaseBuilders).fill(now), starLab: [now] };
  const plan: Plan = { steps: [], deferred: [], costs: {}, assumptions: [
    'Resource income and storage affordability are not simulated. Check costs in-game.',
    `Future work uses a ${preferences.discount}% duration/cost discount; imported work is not discounted twice.`,
    'Play hours use this device’s local time zone. Existing completion times are estimates.',
    'Catalogue requirements are checked; merged structures and special operations need manual verification.',
  ] };
  const gates = new Map<number, { level: number; at: number }[]>();
  for (const entity of snapshot.entities) {
    if (entity.level !== null) gates.set(entity.id, [...gates.get(entity.id) ?? [], { level: entity.level, at: now }]);
  }
  for (const entry of running(snapshot, now).filter(row => !row.ready)) {
    if (!entry.lane) { plan.deferred.push({ name: entry.entity.name, reason: 'Worker rules are unknown for this active timer' }); continue; }
    const lane = entry.lane;
    let worker = -1;
    if (!entry.entity.extra) {
      worker = slots[lane].indexOf(Math.min(...slots[lane]));
      if (slots[lane][worker]! > now) {
        plan.deferred.push({ name: entry.entity.name, reason: 'More active jobs than configured worker capacity; increase capacity or re-import' });
        continue;
      }
      slots[lane][worker] = entry.end;
    }
    plan.steps.push({ key: `existing:${entry.entity.key}`, entityKey: entry.entity.key, name: entry.entity.name,
      from: entry.entity.level ?? 0, to: (entry.entity.level ?? 0) + 1, lane, worker,
      start: snapshot.exportedAt, end: entry.end, cost: {}, existing: true,
      reason: entry.entity.extra ? 'Imported extra slot; future extra-slot hiring is not assumed' : 'Imported running upgrade' });
    if (entry.entity.level !== null && entry.entity.supercharge === undefined && !entry.entity.parentKey) {
      gates.set(entry.entity.id, [...gates.get(entry.entity.id) ?? [], { level: entry.entity.level + 1, at: entry.end }]);
    }
  }
  const pending = [...new Map(queue.map(candidate => [candidate.key, candidate])).values()];
  const deadline = warDeadline(preferences.warDate);
  while (pending.length) {
    let placed = false;
    for (let index = 0; index < pending.length; index++) {
      const candidate = pending[index]!;
      if (candidate.lane === 'instant') { pending.splice(index, 1); placed = true; break; }
      const target = levelAt(candidate.item, candidate.to)!;
      const requirements = Object.entries(target.requirements).filter(([key]) => key !== 'townHall');
      let dependencyAt = now, blocked = false;
      for (const [key, required] of requirements) {
        if (!required) continue;
        const id = key === 'lab' && candidate.entity.village === 'builder' ? 1000046 : requirementIds[key];
        const gate = id ? gates.get(id)?.filter(g => g.level >= required).sort((a, b) => a.at - b.at)[0] : undefined;
        if (!gate) { blocked = true; break; }
        dependencyAt = Math.max(dependencyAt, gate.at);
      }
      if (blocked || target.mergeRequirement) continue;
      const worker = slots[candidate.lane].indexOf(Math.min(...slots[candidate.lane]));
      const start = nextOnline(Math.max(now, slots[candidate.lane][worker]!, dependencyAt), preferences.onlineStart, preferences.onlineEnd);
      const end = start + candidate.seconds * 1000;
      if (preferences.protectHeroes && candidate.entity.kind === 'hero' && candidate.entity.village === 'home' && (preferences.goal === 'war' || preferences.warDate) && (!Number.isFinite(deadline) || end > deadline)) {
        plan.deferred.push({ name: candidate.item.name, reason: Number.isFinite(deadline) ? 'Would finish after your protected war deadline' : 'Set a valid war deadline or disable hero protection' });
        pending.splice(index, 1); placed = true; break;
      }
      plan.steps.push({ key: candidate.key, entityKey: candidate.entity.key, name: candidate.item.name, from: candidate.from,
        to: candidate.to, lane: candidate.lane, worker, start, end, cost: candidate.cost, existing: false, reason: candidate.reasons.join(' · ') });
      slots[candidate.lane][worker] = end;
      gates.set(candidate.item.id, [...gates.get(candidate.item.id) ?? [], { level: candidate.to, at: end }]);
      for (const [resource, value] of Object.entries(candidate.cost)) plan.costs[resource] = (plan.costs[resource] ?? 0) + value;
      pending.splice(index, 1); placed = true; break;
    }
    if (!placed) {
      plan.deferred.push(...pending.map(candidate => ({ name: candidate.item.name, reason: candidate.blockers.join(', ') || 'A prerequisite is not present in this plan' })));
      break;
    }
  }
  plan.steps.sort((a, b) => a.start - b.start || a.end - b.end);
  return plan;
}
export const oreKeys = ['shiny_ore', 'glowy_ore', 'starry_ore'] as const;
export function equipmentCost(item: CatalogueItem, from: number, to: number): Cost {
  if (item.kind !== 'equipment' || !Number.isInteger(from) || !Number.isInteger(to) || to < from || !levelAt(item, to)) throw new Error('Invalid equipment target.');
  const costs: Cost = { shiny_ore: 0, glowy_ore: 0, starry_ore: 0 };
  for (let current = from; current < to; current++) {
    const row = levelAt(item, current); if (!row) throw new Error(`No data for equipment level ${current}.`);
    for (const ore of oreKeys) costs[ore]! += row.costToNext[ore] ?? 0;
  }
  return costs;
}
export function nextBreakpoint(item: CatalogueItem, current: number, cap: number) {
  const before = JSON.stringify(levelAt(item, current)?.abilities ?? []);
  return item.levels.find(row => row.level > current && row.level <= cap && JSON.stringify(row.abilities) !== before)?.level ?? Math.min(current + 1, cap);
}
export function equipmentRows(snapshot: Snapshot, preferences: Preferences) {
  return snapshot.entities.filter(entity => entity.kind === 'equipment' && entity.level !== null).flatMap(entity => {
    const item = lookup(entity.id); if (!item) return [];
    const cap = hallCap(item, snapshot.townHall), current = entity.level!;
    if (!levelAt(item, current)) return [];
    const target = Math.max(current, Math.min(cap, preferences.equipmentTargets[String(entity.id)] ?? nextBreakpoint(item, current, cap)));
    const cost = equipmentCost(item, current, target);
    return [{ entity, item, cap, target, cost, onArmy: relevant(item, preferences),
      deficits: Object.fromEntries(oreKeys.map(key => [key, Math.max(0, (cost[key] ?? 0) - preferences.ore[key])])) }];
  }).sort((a, b) => Number(b.onArmy) - Number(a.onArmy) || a.entity.name.localeCompare(b.entity.name));
}

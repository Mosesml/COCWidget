import data from '../data/catalogue.json';
import type { CatalogueItem, Entity, Level, Snapshot } from './types';

export const catalogueSource = data.source;
export const catalogue = data.items as unknown as CatalogueItem[];
export const byId = new Map(catalogue.map(item => [item.id, item]));
export const lookup = (id: number) => byId.get(id);
export const levelAt = (item: CatalogueItem, level: number): Level | undefined => item.levels.find(row => row.level === level);
export const hallCap = (item: CatalogueItem, hall: number) => Math.max(0, ...item.levels
  .filter(row => row.requirements.townHall <= hall).map(row => row.level));
export const currentSnapshot = (account: { snapshots: Snapshot[] }) => account.snapshots[account.snapshots.length - 1]!;
export const currentLevel = (snapshot: Snapshot, id: number) => Math.max(0, ...snapshot.entities.filter(e => e.id === id).map(e => e.level ?? 0));
export function capacity(snapshot: Snapshot, key: keyof Level['requirements'], village: Entity['village'] = 'home') {
  const ids = { townHall: village === 'builder' ? 1000034 : 1000001,
    lab: village === 'builder' ? 1000046 : 1000007, heroHall: 1000071, petHouse: 1000068, blacksmith: 1000070 };
  return currentLevel(snapshot, ids[key]);
}

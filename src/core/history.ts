import type { Snapshot } from './types';

export interface Change { id: number; name: string; section: string; before: Record<string, number>; after: Record<string, number>; levelsGained: number; count: number }
export function compareSnapshots(before: Snapshot, after: Snapshot) {
  if (before.tag !== after.tag) throw new Error('Compare snapshots of the same village.');
  const common = before.sections.filter(section => after.sections.includes(section));
  const distribution = (snapshot: Snapshot) => {
    const map = new Map<string, { id: number; name: string; section: string; levels: Record<string, number> }>();
    for (const entity of snapshot.entities) {
      if (entity.parentKey || entity.level === null || !common.includes(entity.section)) continue;
      const key = `${entity.section}:${entity.id}`;
      const entry = map.get(key) ?? { id: entity.id, name: entity.name, section: entity.section, levels: {} };
      entry.levels[entity.level] = (entry.levels[entity.level] ?? 0) + entity.count; map.set(key, entry);
    }
    return map;
  };
  const left = distribution(before), right = distribution(after), changes: Change[] = [];
  const totalLevels = (levels: Record<string, number>) => Object.entries(levels).reduce((sum, [level, count]) => sum + Number(level) * count, 0);
  for (const key of new Set([...left.keys(), ...right.keys()])) {
    const a = left.get(key), b = right.get(key), descriptor = b ?? a!;
    if (JSON.stringify(a?.levels ?? {}) === JSON.stringify(b?.levels ?? {})) continue;
    const countA = Object.values(a?.levels ?? {}).reduce((sum, count) => sum + count, 0);
    const countB = Object.values(b?.levels ?? {}).reduce((sum, count) => sum + count, 0);
    changes.push({ id: descriptor.id, name: descriptor.name, section: descriptor.section,
      before: a?.levels ?? {}, after: b?.levels ?? {}, count: countB - countA,
      levelsGained: countA === countB ? totalLevels(b?.levels ?? {}) - totalLevels(a?.levels ?? {}) : 0 });
  }
  return { changes, skippedSections: [...new Set([...before.sections, ...after.sections])].filter(s => !common.includes(s)),
    from: before.exportedAt, to: after.exportedAt };
}
export function progressReport(name: string, before: Snapshot, after: Snapshot) {
  const report = compareSnapshots(before, after);
  return [`${name} · COCWidget progress`,
    `${new Date(report.from).toLocaleDateString()} → ${new Date(report.to).toLocaleDateString()}`,
    ...report.changes.map(c => `${c.name}: ${c.levelsGained > 0 ? `+${c.levelsGained} total levels` : 'inventory changed'}${c.count ? ` (${c.count > 0 ? '+' : ''}${c.count} items)` : ''}`),
    report.skippedSections.length ? `Not compared: ${report.skippedSections.join(', ')} (missing from one snapshot).` : '',
    'Observed snapshot changes. Actions between imports are not known.'].filter(Boolean).join('\n');
}

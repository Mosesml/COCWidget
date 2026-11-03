import { currentSnapshot } from './catalogue';
import { recommendations } from './strategy';
import { running } from './time';
import type { Lane, Workspace } from './types';

export interface WidgetAccount {
  tag: string; name: string; townHall: number; exportedAt: number; demo: boolean; builders: number;
  rows: { id: string; name: string; level: string; end: number; lane: Lane | null; extra: boolean }[];
  nextAction: { name: string; level: string; reason: string } | null;
}
export interface WidgetProjection { version: 1; generatedAt: number; accounts: WidgetAccount[] }
export function widgetProjection(workspace: Workspace, now: number): WidgetProjection {
  return { version: 1, generatedAt: now, accounts: workspace.accounts.map(account => {
    const snapshot = currentSnapshot(account), candidate = recommendations(snapshot, account.preferences, now).find(c => !c.blockers.length);
    return { tag: account.tag, name: account.name, townHall: snapshot.townHall, exportedAt: snapshot.exportedAt,
      demo: account.demo, builders: account.preferences.builders,
      rows: running(snapshot, now).map(row => ({ id: row.entity.key, name: row.entity.name,
        level: row.entity.supercharge !== undefined ? `SC ${row.entity.supercharge + 1}` : `Lv ${(row.entity.level ?? 0) + 1}`,
        end: row.end, lane: row.lane, extra: row.entity.extra })),
      nextAction: candidate ? { name: candidate.item.name, level: `${candidate.from} → ${candidate.to}`, reason: candidate.reasons[0] ?? 'Your next upgrade' } : null };
  }) };
}
export function widgetDates(projection: WidgetProjection, now: number) {
  return [...new Set([now, ...projection.accounts.flatMap(account => [account.exportedAt + 86400000,
    ...account.rows.map(row => row.end)]).filter(time => time > now)])].sort((a, b) => a - b).slice(0, 500);
}

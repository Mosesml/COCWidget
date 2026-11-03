import primary from '../../tests/fixtures/village-export.json';
import helper from '../../tests/fixtures/helper-export.json';
import { hallCap, lookup } from '../core/catalogue';
import { parseExport } from '../core/import';
import { defaults } from '../core/workspace';
import type { JsonObject, Workspace } from '../core/types';

export function demoWorkspace(now = Date.now()): Workspace {
  const equipment = [
    { data: 90000000, lvl: 12 }, { data: 90000004, lvl: 14 }, { data: 90000010, lvl: 17 },
    { data: 90000014, lvl: 15 }, { data: 90000022, lvl: 17 }, { data: 90000024, lvl: 14 },
    { data: 90000032, lvl: 14 }, { data: 90000034, lvl: 14 },
  ];
  const before = { ...primary, equipment, tag: '#DEMO16', timestamp: Math.floor(now / 1000) - 3 * 86400 };
  const after = { ...primary, ...helper, equipment, tag: '#DEMO16', timestamp: Math.floor(now / 1000) - 900 };
  const small = JSON.parse(JSON.stringify(primary)) as JsonObject;
  for (const [key, rows] of Object.entries(small)) {
    if (!Array.isArray(rows)) continue;
    small[key] = rows.filter(row => {
      if (typeof row !== 'object' || row === null || Array.isArray(row)) return false;
      const item = lookup(row.data as number);
      if (item?.village !== 'builder' && item?.levels.length && hallCap(item, 12) < 1) return false;
      if (row.data === 1000097) return false;
      if (typeof row.lvl === 'number' && item?.levels.length && item.village !== 'builder') row.lvl = Math.min(row.lvl, hallCap(item, 12));
      delete row.timer; delete row.extra; delete row.helper_timer; delete row.helper_recurrent;
      return true;
    });
  }
  (small.buildings as JsonObject[]).find(row => row.data === 1000001)!.lvl = 12;
  const archer = (small.buildings as JsonObject[]).find(row => row.data === 1000009);
  if (archer) { delete archer.cnt; archer.timer = 11800; }
  small.equipment = equipment.filter(row => row.data !== 90000034).map(row => ({ ...row, lvl: Math.min(row.lvl, 12) }));
  small.tag = '#DEMO12'; small.timestamp = Math.floor(now / 1000) - 600; small.boosts = {};
  const snapshots = [parseExport(JSON.stringify(before), now), parseExport(JSON.stringify(after), now)];
  const side = parseExport(JSON.stringify(small), now);
  return { version: 1, activeTag: '#DEMO16', accounts: [
    { tag: '#DEMO16', name: 'Northwind', demo: true, snapshots, preferences: {
      ...defaults(6), ore: { shiny_ore: 12500, glowy_ore: 480, starry_ore: 65 },
    } },
    { tag: '#DEMO12', name: 'Little village', demo: true, snapshots: [side], preferences: {
      ...defaults(6), armyId: 'hybrid', ore: { shiny_ore: 4200, glowy_ore: 120, starry_ore: 0 },
    } },
  ] };
}

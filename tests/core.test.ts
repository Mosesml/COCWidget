import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseExport, exportFromLink, importLink } from '../src/core/import';
import { compareSnapshots } from '../src/core/history';
import { acceptSnapshot, decodeBackup, defaults, emptyWorkspace, encodeBackup } from '../src/core/workspace';
import { catalogue, levelAt, lookup } from '../src/core/catalogue';
import { equipmentCost, recommendations, schedule } from '../src/core/strategy';
import { finishAt, nextOnline, compareMagicItem } from '../src/core/time';
import type { JsonObject } from '../src/core/types';
import { widgetDates, widgetProjection } from '../src/core/widgets';
import { demoWorkspace } from '../src/data/demo';

const fixture = (name = 'village-export') => JSON.parse(readFileSync(new URL(`./fixtures/${name}.json`, import.meta.url), 'utf8')) as JsonObject;
const firstRaw = fixture(), laterRaw = fixture('helper-export');
const now = (laterRaw.timestamp as number) * 1000;
const first = parseExport(JSON.stringify(firstRaw), now), later = parseExport(JSON.stringify(laterRaw), now);

test('imports complete counted inventory and preserves every original field', () => {
  assert.deepEqual(first.raw, firstRaw);
  assert.equal(first.townHall, 16); assert.equal(first.builderHall, 9); assert.equal(first.builders, 6);
  assert.equal(first.entities.filter(e => e.section === 'buildings' && !e.parentKey).reduce((sum, e) => sum + e.count, 0), 423);
  assert.equal(first.entities.filter(e => e.id === 1000010).reduce((sum, e) => sum + e.count, 0), 325);
  assert.equal(first.entities.filter(e => e.parentKey).length, 12);
  assert.equal(first.entities.filter(e => e.timer !== undefined).length, 13);
});
test('unknown fields, sections and nested timers survive parsing', () => {
  const raw = fixture();
  raw.future = [{ data: 9999999, lvl: 1, timer: 100, mystery: { flag: true } }];
  const buildings = raw.buildings as JsonObject[];
  buildings.push({ data: 9999998, types: [{ data: 103000011, modules: [{ data: 102000034, lvl: 2, timer: 77 }] }] });
  const result = parseExport(JSON.stringify(raw), now);
  assert.deepEqual(result.raw, raw);
  assert.equal(result.entities.find(e => e.id === 102000034 && e.timer === 77)?.parentKey?.includes('.types'), true);
  assert.equal(result.entities.find(e => e.id === 9999999)?.known, false);
});
test('invalid negative, fractional, counted timers and future snapshots are rejected', () => {
  const invalid: JsonObject[] = [{ cnt: -1 }, { lvl: 1.2 }, { timer: -1 }, { timer: 4, cnt: 2 }, { extra: 'true' }];
  for (const patch of invalid) {
    const raw = fixture(); (raw.buildings as JsonObject[]).push({ data: 1000008, lvl: 1, ...patch });
    assert.throws(() => parseExport(JSON.stringify(raw), now));
  }
  assert.throws(() => parseExport(JSON.stringify({ ...firstRaw, timestamp: now / 1000 + 600 }), now));
  assert.throws(() => parseExport('{"tag":"#AAA","timestamp":1793646016}', now));
});
test('history compares distributions and does not delete omitted categories', () => {
  const comparison = compareSnapshots(first, later);
  assert.equal(comparison.changes.find(c => c.id === 1000010)?.levelsGained, 62);
  assert.equal(comparison.changes.find(c => c.id === 28000001)?.levelsGained, 1);
  assert.ok(comparison.skippedSections.includes('traps'));
  assert.equal(comparison.changes.some(c => c.section === 'traps'), false);
});
test('villages are independent, duplicate/old exports rejected, backup reparsed', () => {
  let state = acceptSnapshot(emptyWorkspace(), first, 'Main');
  state = acceptSnapshot(state, later);
  assert.throws(() => acceptSnapshot(state, later), /already saved/);
  assert.throws(() => acceptSnapshot(state, first), /older/);
  const second = parseExport(JSON.stringify({ ...firstRaw, tag: '#SECOND' }), now);
  state = acceptSnapshot(state, second, 'Second');
  assert.equal(state.accounts.length, 2);
  assert.equal(state.accounts[0]?.snapshots.length, 2);
  assert.equal(state.accounts[1]?.preferences.queue.length, 0);
  const restored = decodeBackup(encodeBackup(state), now);
  assert.deepEqual(restored.accounts.map(a => a.snapshots.map(s => s.raw)), state.accounts.map(a => a.snapshots.map(s => s.raw)));
  const corrupt = JSON.parse(encodeBackup(state)); corrupt.workspace.accounts[0].preferences.ore.shiny_ore = -10;
  assert.throws(() => decodeBackup(JSON.stringify(corrupt), now), /Ore/);
});
test('deep links round-trip JSON and cannot import arbitrary URL hosts', () => {
  const text = JSON.stringify(firstRaw);
  assert.equal(exportFromLink(importLink(text)), text);
  assert.equal(exportFromLink('https://example.com/import?data=foo'), null);
  assert.equal(exportFromLink('cocwidget://settings?data=foo'), null);
});
test('catalogue costs use incoming building rows and outgoing equipment rows', () => {
  assert.equal(levelAt(lookup(1000008)!, 1)?.costToNext.Gold, 1000);
  const puppet = lookup(90000000)!;
  assert.deepEqual(equipmentCost(puppet, 1, 3), { shiny_ore: 360, glowy_ore: 20, starry_ore: 0 });
  assert.throws(() => equipmentCost(puppet, 1, 100));
  assert.ok(catalogue.length > 1000);
});
test('boost integration anchors stale imports and isolates research from builder potions', () => {
  const heroHall = first.entities.find(e => e.id === 1000071 && e.timer !== undefined)!;
  assert.equal(finishAt(first, heroHall), first.exportedAt + (70043 - 9 * 1608) * 1000);
  const lab = first.entities.find(e => e.section === 'units' && e.timer !== undefined)!;
  assert.equal(finishAt(first, lab), first.exportedAt + lab.timer! * 1000);
  const helper = later.entities.find(e => e.id === 28000001)!;
  assert.ok(finishAt(later, helper)! < later.exportedAt + helper.timer! * 1000);
});
test('magic-item comparison changes future work without retroactively boosting elapsed time', () => {
  const result = compareMagicItem(first, first.exportedAt + 3600000, 'builderPotion');
  assert.ok(result.totalSeconds > 0);
  assert.ok(result.savings.every(s => s.seconds >= 0 && s.seconds <= 9 * 3600 + 1));
  assert.equal(compareMagicItem(first, first.exportedAt + 1000 * 86400000, 'builderPotion').totalSeconds, 0);
});
test('planner reserves workers, uses online starts, excludes unknown operations and totals resources', () => {
  const preferences = defaults(first.builders);
  const candidates = recommendations(first, preferences, first.exportedAt).filter(c => c.blockers.length === 0).slice(0, 8);
  assert.ok(candidates.length > 0);
  const plan = schedule(first, preferences, candidates, first.exportedAt);
  const future = plan.steps.filter(s => !s.existing);
  assert.equal(future.length, candidates.length);
  for (const step of future) {
    assert.ok(new Date(step.start).getHours() >= 8 && new Date(step.start).getHours() < 23);
    const overlap = plan.steps.filter(s => s.key !== step.key && s.lane === step.lane && s.worker === step.worker && s.start < step.end && s.end > step.start);
    assert.equal(overlap.length, 0);
  }
  assert.equal(Object.values(plan.costs).reduce((a, b) => a + b, 0), candidates.reduce((sum, c) => sum + Object.values(c.cost).reduce((a, b) => a + b, 0), 0));
});
test('online windows handle overnight play and all-day mode', () => {
  const morning = new Date(2026, 10, 3, 6).getTime();
  assert.equal(new Date(nextOnline(morning, 8, 23)).getHours(), 8);
  assert.equal(nextOnline(morning, 20, 8), morning);
  assert.equal(nextOnline(morning, 0, 0), morning);
});
test('planning waits for a queued laboratory prerequisite even when research was selected first', () => {
  const raw = fixture();
  const laboratory = (raw.buildings as JsonObject[]).find(e => e.data === 1000007)!;
  laboratory.lvl = 2; delete laboratory.timer;
  const barbarian = (raw.units as JsonObject[]).find(e => e.data === 4000000)!;
  barbarian.lvl = 2; delete barbarian.timer;
  const snapshot = parseExport(JSON.stringify(raw), now), preferences = defaults(snapshot.builders);
  const choices = recommendations(snapshot, preferences, now);
  const lab = choices.find(c => c.item.id === 1000007)!, research = choices.find(c => c.item.id === 4000000)!;
  assert.ok(lab && research);
  assert.ok(research.blockers.includes('Laboratory 3'));
  const plan = schedule(snapshot, preferences, [research, lab], now);
  const labStep = plan.steps.find(s => s.key === lab.key)!, researchStep = plan.steps.find(s => s.key === research.key)!;
  assert.ok(labStep && researchStep); assert.ok(researchStep.start >= labStep.end);
});
test('protected heroes are deferred for an impossible or missing war deadline', () => {
  const preferences = { ...defaults(first.builders), goal: 'war' as const, warDate: '2026-02-31' };
  const hero = recommendations(first, preferences, first.exportedAt).find(c => c.entity.kind === 'hero')!;
  assert.ok(hero);
  assert.ok(hero.blockers.some(text => text.includes('valid war deadline')));
  const plan = schedule(first, preferences, [hero], first.exportedAt);
  assert.ok(plan.deferred.some(row => row.name === hero.item.name));
  assert.equal(plan.steps.filter(s => !s.existing).length, 0);
});
test('widget projections keep account selection independent from the active app profile', () => {
  const workspace = demoWorkspace(now);
  const a = widgetProjection(workspace, now), b = widgetProjection({ ...workspace, activeTag: '#DEMO12' }, now);
  assert.deepEqual(a, b); assert.equal(a.accounts.length, 2);
  assert.equal('raw' in a.accounts[0]!, false);
  assert.equal(a.accounts[0]!.exportedAt, workspace.accounts[0]!.snapshots[1]!.exportedAt);
  const dates = widgetDates(a, now);
  assert.equal(dates[0], now); assert.ok(dates.every((date, i) => i === 0 || date > dates[i - 1]!));
});
test('large widget timelines remain bounded and preserve the final completion boundary', () => {
  const projection = widgetProjection(demoWorkspace(now), now);
  projection.accounts[0]!.rows = Array.from({ length: 300 }, (_, index) => ({ id: String(index), name: 'Upgrade', level: 'Lv 2', lane: 'builder' as const, extra: false, end: now + (index + 1) * 600000 }));
  const dates = widgetDates(projection, now);
  assert.ok(dates.length <= 96);
  assert.ok(dates[dates.length - 1]! >= now + 300 * 600000);
});

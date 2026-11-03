import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import raw from './fixtures/village-export.json';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { parseExport } from '../src/core/import';
import { parseSyncLink, SyncCoordinator } from '../src/core/sync';
import { emptyWorkspace } from '../src/core/workspace';
import { readExport } from '../scripts/lib/watch';
import { isSyncResult } from '../scripts/lib/android';
import { widgetDates } from '../src/core/widgets';

test('unpaired external requests cannot read clipboard/files or mutate storage', async () => {
  let calls = 0;
  const coordinator = new SyncCoordinator({ enabled: () => true, authorize: request => request.token === 'paired',
    clipboard: async () => { calls++; return ''; }, readFile: async () => { calls++; return ''; },
    commit: async mutate => { calls++; return mutate(emptyWorkspace()); }, publish: async () => { calls++; return { available: true }; }, report: async () => {},
  });
  for (const request of [{ clipboard: true }, { clipboard: false, file: true }, { clipboard: false, text: JSON.stringify(raw) }]) {
    const result = await coordinator.receive({ requestId: 'untrusted', background: true, ...request });
    assert.equal(result.status, 'failed'); assert.match(result.message!, /pairing code/);
  }
  assert.equal(calls, 0);
});
test('ambiguous and malformed sync URLs are rejected', () => {
  for (const url of ['cocwidget://sync-file?requestId=a&requestId=b', 'cocwidget://sync-file/path?requestId=a',
    'cocwidget://user@sync-file?requestId=a', 'cocwidget://sync-clipboard?data=hello', 'cocwidget://sync-file?token=bad']) {
    assert.throws(() => parseSyncLink(url));
  }
});
test('unknown fields remain bounded by UTF-8 size, depth and finite values', () => {
  assert.throws(() => parseExport(JSON.stringify({ ...raw, unknown: '🙂'.repeat(260000) })), /too large/);
  assert.throws(() => parseExport(JSON.stringify({ ...raw, unknown: JSON.parse('['.repeat(100) + '0' + ']'.repeat(100)) })), /too complex/);
  assert.throws(() => parseExport(JSON.stringify(raw).replace(/"timestamp":\s*\d+/, '"timestamp":1e999')), /invalid number/);
  const many = { ...raw, unknown_timers: Array.from({ length: 65 }, () => ({ data: 9999999, timer: 10 })) };
  assert.throws(() => parseExport(JSON.stringify(many)), /64 active timer/);
});
test('file reads reject oversized data and invalid UTF-8', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'coc-bounds-'));
  const file = join(directory, 'village.json');
  try {
    await writeFile(file, Buffer.alloc(1_000_001)); await assert.rejects(readExport(file), /1 MB/);
    await writeFile(file, Buffer.from([0xff, 0xfe])); await assert.rejects(readExport(file), /encoded data/);
  } finally { await rm(directory, { recursive: true, force: true }); }
});
test('a malformed or contradictory acknowledgement cannot be successful', () => {
  const success = { status: 'updated', widgetUpdated: true, completedAt: Date.now(), tag: '#TEST', exportedAt: Date.now() };
  assert.equal(isSyncResult(success), true);
  for (const value of [null, {}, { ...success, status: 'failed' }, { ...success, exportedAt: 'wrong' }, { ...success, tag: null }]) assert.equal(isSyncResult(value), false);
});
test('large WidgetKit projections bound repeated timeline payloads', () => {
  const now = Date.now();
  const rows = Array.from({ length: 64 }, (_, i) => ({ id: String(i), name: 'A'.repeat(96), level: 'Lv 10', end: now + i * 600000, lane: null, extra: false }));
  const projection = { version: 1 as const, generatedAt: now, accounts: Array.from({ length: 25 }, (_, i) => ({ tag: `#TEST${i}`, name: 'Village', townHall: 16, exportedAt: now, demo: false, builders: 6, rows, nextAction: null })) };
  const dates = widgetDates(projection, now);
  assert.ok(dates.length * JSON.stringify(projection).length <= 1_000_000);
  assert.equal(dates[0], now); assert.ok(dates.at(-1)! >= now + 86400000);
});

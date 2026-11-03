import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, writeFile, rename, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { applySync, parseSyncLink, syncLink, SyncCoordinator, type SyncResult } from '../src/core/sync';
import { emptyWorkspace } from '../src/core/workspace';
import { watchExports } from '../scripts/lib/watch';
import type { Workspace } from '../src/core/types';

const now = Date.now();
async function exported(offset = 0) {
  const raw = JSON.parse(await readFile(new URL('./fixtures/village-export.json', import.meta.url), 'utf8'));
  raw.tag = '#SYNCTEST'; raw.timestamp = Math.floor(now / 1000) - 100 + offset;
  return JSON.stringify(raw);
}
function harness(options: { enabled?: boolean; publish?: () => Promise<{ available: boolean }> } = {}) {
  let workspace = emptyWorkspace();
  const events: string[] = [], reports: SyncResult[] = [];
  const coordinator = new SyncCoordinator({
    enabled: () => options.enabled ?? true,
    now: () => now,
    commit: async mutate => { const value = mutate(workspace); events.push('save'); workspace = value; return workspace; },
    publish: async () => { events.push('publish'); return options.publish ? options.publish() : { available: true }; },
    clipboard: async () => { events.push('clipboard'); return exported(); },
    readFile: async () => exported(),
    report: async result => { events.push('ack'); reports.push(result); },
  });
  return { coordinator, events, reports, get workspace() { return workspace; } };
}
test('automatic sync saves first and acknowledges only after the widget publisher completes', async () => {
  let finish!: (value: { available: boolean }) => void;
  let started!: () => void;
  const publishing = new Promise<void>(resolve => { started = resolve; });
  const h = harness({ publish: () => { started(); return new Promise(resolve => { finish = resolve; }); } });
  const pending = h.coordinator.receive({ requestId: 'one', text: await exported(), clipboard: false, background: true });
  await publishing;
  assert.deepEqual(h.events, ['save', 'publish']); assert.equal(h.workspace.accounts.length, 1); assert.equal(h.reports.length, 0);
  finish({ available: true });
  assert.equal((await pending).widgetUpdated, true); assert.deepEqual(h.events, ['save', 'publish', 'ack']);
});
test('disabled automation neither reads the clipboard nor changes stored data', async () => {
  const h = harness({ enabled: false });
  const result = await h.coordinator.receive({ requestId: 'off', clipboard: true, background: false });
  assert.equal(result.status, 'disabled'); assert.deepEqual(h.events, ['ack']); assert.equal(h.workspace.accounts.length, 0);
});
test('duplicate and older deliveries are idempotent and preserve the active app account', async () => {
  const text = await exported(), h = harness();
  await h.coordinator.receive({ requestId: 'first', text, clipboard: false, background: false });
  const reordered = JSON.stringify(Object.fromEntries(Object.entries(JSON.parse(text)).reverse()));
  assert.equal((await h.coordinator.receive({ requestId: 'retry', text: reordered, clipboard: false, background: false })).status, 'unchanged');
  assert.equal((await h.coordinator.receive({ requestId: 'old', text: await exported(-10), clipboard: false, background: false })).status, 'ignored_older');
  assert.equal(h.workspace.accounts[0]!.snapshots.length, 1);
  const second = JSON.parse(text); second.tag = '#SECOND';
  await h.coordinator.receive({ requestId: 'other', text: JSON.stringify(second), clipboard: false, background: false });
  assert.equal(h.workspace.activeTag, '#SYNCTEST'); assert.equal(h.workspace.accounts.length, 2);
});
test('a failed widget write can be retried without duplicating the saved snapshot', async () => {
  let attempts = 0;
  const h = harness({ publish: async () => { if (++attempts === 1) throw new Error('Storage unavailable'); return { available: true }; } });
  const request = { requestId: 'retry', text: await exported(), clipboard: false, background: false };
  assert.equal((await h.coordinator.receive(request)).status, 'failed');
  assert.equal(h.workspace.accounts[0]!.snapshots.length, 1);
  const retry = await h.coordinator.receive(request);
  assert.equal(retry.status, 'unchanged'); assert.equal(retry.widgetUpdated, true); assert.equal(h.workspace.accounts[0]!.snapshots.length, 1);
});
test('concurrent deliveries serialize persistence and widget publications', async () => {
  const h = harness();
  await Promise.all([0, 1, 2].map(async index => h.coordinator.receive({ requestId: `parallel-${index}`, text: await exported(index), clipboard: false, background: false })));
  assert.deepEqual(h.events, ['save', 'publish', 'ack', 'save', 'publish', 'ack', 'save', 'publish', 'ack']);
  assert.equal(h.workspace.accounts[0]!.snapshots.at(-1)!.exportedAt, (JSON.parse(await exported(2)).timestamp) * 1000);
});
test('bad JSON, stale copied data and wrong-village exports cannot replace saved data', async () => {
  const text = await exported(), h = harness();
  await h.coordinator.receive({ requestId: 'baseline', text, clipboard: false, background: false });
  const baseline = h.workspace;
  assert.equal((await h.coordinator.receive({ requestId: 'bad', text: '{broken', clipboard: false, background: false })).status, 'failed');
  assert.equal((await h.coordinator.receive({ requestId: 'stale-clipboard', clipboard: true, background: false, notBefore: now })).status, 'failed');
  assert.throws(() => applySync(baseline, text, now, { expectedTag: '#WRONG' }), /does not match/);
  assert.equal(h.workspace, baseline);
});
test('sync URLs cover automatic text, clipboard and file intake with bounded request IDs', async () => {
  const text = await exported();
  assert.equal(parseSyncLink(syncLink(text, 'delivery-1', true))!.text, text);
  assert.equal(parseSyncLink('cocwidget://sync-clipboard?requestId=abc')!.clipboard, true);
  assert.equal(parseSyncLink('cocwidget://sync-file?requestId=abc')!.file, true);
  assert.equal(parseSyncLink('https://example.com/sync?data=anything'), null);
  assert.throws(() => parseSyncLink('cocwidget://sync-file?requestId=../secret'), /request ID/);
  assert.throws(() => parseSyncLink('cocwidget://sync-clipboard?notBefore=NaN'), /freshness/);
});
test('file watcher survives partial/atomic writes and retries missing acknowledgements', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'cocwatch-test-')), filename = join(directory, 'village.json');
  const stop = new AbortController(), logs: string[] = [], h = harness();
  let attempts = 0;
  try {
    await writeFile(filename, '{partial');
    const watching = watchExports({ source: filename, interval: 20, signal: stop.signal, log: line => logs.push(line),
      deliver: async text => {
        if (++attempts === 1) throw new Error('No acknowledgement');
        const result = await h.coordinator.receive({ requestId: 'file', text, clipboard: false, background: false });
        stop.abort(); return result;
      },
    });
    const deadline = Date.now() + 3000;
    while (!logs.length && Date.now() < deadline) await new Promise(resolve => setTimeout(resolve, 10));
    await writeFile(join(directory, 'replacement.tmp'), await exported());
    await rename(join(directory, 'replacement.tmp'), filename);
    const timeout = setTimeout(() => stop.abort(), 3000);
    await watching; clearTimeout(timeout);
    assert.equal(attempts, 2); assert.equal(h.workspace.accounts.length, 1);
    assert.ok(logs.some(line => line.includes('No acknowledgement')));
    assert.ok(logs.some(line => line.startsWith('updated:')));
  } finally { stop.abort(); await rm(directory, { recursive: true, force: true }); }
});

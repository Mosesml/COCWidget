import { test } from 'node:test';
import assert from 'node:assert/strict';
import { WorkspaceRepository, legacyWorkspaceKey, workspacePointerKey, type WorkspaceIO } from '../src/core/persistence';
import { acceptSnapshot, emptyWorkspace, encodeBackup } from '../src/core/workspace';
import { parseExport } from '../src/core/import';
import { SyncCoordinator } from '../src/core/sync';
import fixture from './fixtures/village-export.json';

function storage() {
  const metadata = new Map<string, string>(), files = new Map<string, string>();
  let generation = 0;
  const io: WorkspaceIO = {
    get: async key => metadata.get(key) ?? null,
    set: async (key, value) => { assert.ok(value.length < 100); metadata.set(key, value); },
    remove: async key => { metadata.delete(key); }, identifier: () => `generation-${++generation}`,
    read: async name => { if (!files.has(name)) throw new Error('Missing file'); return files.get(name)!; },
    write: async (name, value) => { files.set(name, value); }, unlink: async name => { files.delete(name); },
  };
  return { metadata, files, io, repository: new WorkspaceRepository(io) };
}
test('workspace history larger than Android CursorWindow stays in files, with only a small metadata pointer', async () => {
  const s = storage();
  let workspace = emptyWorkspace();
  for (let i = 0; i < 4; i++) workspace = acceptSnapshot(workspace, parseExport(JSON.stringify({ ...fixture,
    timestamp: fixture.timestamp + i, large_preserved_field: 'x'.repeat(700000) })));
  await s.repository.save(workspace);
  assert.ok([...s.files.values()][0]!.length > 2_000_000);
  const loaded = await s.repository.load();
  assert.equal(loaded.accounts[0]!.snapshots.length, 4);
  assert.equal(loaded.accounts[0]!.snapshots[3]!.raw.large_preserved_field, 'x'.repeat(700000));
  await s.repository.save(loaded);
  assert.equal(s.files.size, 1);
});
test('legacy migration removes old data only after a readable file generation is committed', async () => {
  const s = storage(), workspace = acceptSnapshot(emptyWorkspace(), parseExport(JSON.stringify(fixture)));
  s.metadata.set(legacyWorkspaceKey, encodeBackup(workspace));
  const loaded = await s.repository.load();
  assert.equal(loaded.accounts.length, 1); assert.equal(s.metadata.has(legacyWorkspaceKey), false);
  assert.ok(s.metadata.get(workspacePointerKey));
});
test('failed file or pointer writes preserve the acknowledged generation and unreadable data never falls back to empty', async () => {
  const s = storage();
  await s.repository.save(emptyWorkspace());
  const pointer = s.metadata.get(workspacePointerKey)!;
  const write = s.io.write;
  s.io.write = async () => { throw new Error('Disk full'); };
  await assert.rejects(s.repository.save(emptyWorkspace()), /Disk full/);
  assert.equal(s.metadata.get(workspacePointerKey), pointer); assert.ok(s.files.has(pointer));
  s.io.write = write;
  s.io.set = async () => { throw new Error('Pointer write failed'); };
  await assert.rejects(s.repository.save(emptyWorkspace()), /Pointer write/);
  assert.equal(s.metadata.get(workspacePointerKey), pointer); assert.ok(s.files.has(pointer));
  s.files.set(pointer, '{broken'); await assert.rejects(s.repository.load());
});
test('backup recovery can replace an unreadable workspace through the serialized publisher', async () => {
  const events: string[] = [];
  const coordinator = new SyncCoordinator({ enabled: () => false, authorize: () => false,
    commit: async () => { throw new Error('Workspace is not ready'); },
    replace: async workspace => { events.push('restore'); return workspace; },
    publish: async () => { events.push('publish'); return { available: true }; },
    clipboard: async () => '', report: async () => {},
  });
  assert.deepEqual(await coordinator.replace(emptyWorkspace()), emptyWorkspace());
  assert.deepEqual(events, ['restore', 'publish']);
});

import { readdir, open, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve, join } from 'node:path';
import { parseExport } from '../../src/core/import';
import type { SyncResult } from '../../src/core/sync';

export interface WatchOptions {
  source: string;
  deliver: (text: string) => Promise<SyncResult>;
  log: (message: string) => void;
  signal: AbortSignal;
  interval?: number;
}
export async function readExport(filename: string) {
  const file = await open(filename, 'r');
  try {
    const info = await file.stat();
    if (!info.isFile() || info.size > 1_000_000) throw new Error('Expected a JSON file of at most 1 MB.');
    const buffer = Buffer.alloc(1_000_001);
    let size = 0;
    while (size < buffer.length) {
      const { bytesRead } = await file.read(buffer, size, buffer.length - size, null);
      if (!bytesRead) break;
      size += bytesRead;
    }
    if (size > 1_000_000) throw new Error('Export exceeds the 1 MB limit.');
    const text = new TextDecoder('utf-8', { fatal: true }).decode(buffer.subarray(0, size));
    return { text, snapshot: parseExport(text) };
  } finally { await file.close(); }
}
/** Polling survives atomic file replacement; only acknowledged snapshots are marked delivered. */
export async function watchExports(options: WatchOptions) {
  const source = resolve(options.source), delivered = new Map<string, number>(), errors = new Map<string, string>();
  const retries = new Map<string, { key: string; attempts: number; after: number }>();
  while (!options.signal.aborted) {
    try {
      const info = await stat(source);
      const names = info.isDirectory() ? (await readdir(source)).filter(name => name.endsWith('.json')).sort() : [];
      if (names.length > 1024) throw new Error('Watch at most 1,024 JSON files in a folder.');
      const files = info.isDirectory() ? names.map(name => join(source, name)) : [source];
      for (const filename of files) {
        if (options.signal.aborted) break;
        try {
          const { text, snapshot } = await readExport(filename);
          const key = createHash('sha256').update(text).digest('hex');
          if (delivered.has(key)) continue;
          const retry = retries.get(filename);
          if (retry?.key === key && retry.after > Date.now()) continue;
          const attempts = retry?.key === key ? retry.attempts + 1 : 1;
          retries.set(filename, { key, attempts, after: Date.now() + Math.min(60_000, (options.interval ?? 1000) * 2 ** Math.min(attempts - 1, 6)) });
          if (retries.size > 1024) retries.delete(retries.keys().next().value!);
          const result = await options.deliver(text);
          if (!result.widgetUpdated) throw new Error(result.message ?? `Delivery was ${result.status}.`);
          delivered.set(key, snapshot.exportedAt); errors.delete(filename); retries.delete(filename);
          if (delivered.size > 1024) delivered.delete(delivered.keys().next().value!);
          options.log(`${result.status}: ${snapshot.tag} · exported ${new Date(snapshot.exportedAt).toISOString()}`);
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Delivery failed.';
          if (errors.get(filename) !== message) { options.log(`${filename}: ${message} Will retry.`); errors.set(filename, message); }
          if (errors.size > 1024) errors.delete(errors.keys().next().value!);
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Source is unavailable.';
      if (errors.get(source) !== message) { options.log(`Waiting for ${source}: ${message}`); errors.set(source, message); }
    }
    await new Promise<void>(resolveWait => {
      if (options.signal.aborted) { resolveWait(); return; }
      const done = () => { clearTimeout(timer); options.signal.removeEventListener('abort', done); resolveWait(); };
      const timer = setTimeout(done, options.interval ?? 1000);
      options.signal.addEventListener('abort', done, { once: true });
    });
  }
}

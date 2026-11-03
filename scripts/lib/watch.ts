import { readdir, readFile, stat } from 'node:fs/promises';
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
  const info = await stat(filename);
  if (!info.isFile() || info.size > 1_000_000) throw new Error('Expected a JSON file of at most 1 MB.');
  const text = await readFile(filename, 'utf8');
  return { text, snapshot: parseExport(text) };
}
/** Polling survives atomic file replacement; only acknowledged snapshots are marked delivered. */
export async function watchExports(options: WatchOptions) {
  const source = resolve(options.source), delivered = new Map<string, number>(), errors = new Map<string, string>();
  while (!options.signal.aborted) {
    try {
      const info = await stat(source);
      const files = info.isDirectory() ? (await readdir(source)).filter(name => name.endsWith('.json')).sort().map(name => join(source, name)) : [source];
      for (const filename of files) {
        if (options.signal.aborted) break;
        try {
          const { text, snapshot } = await readExport(filename);
          if (delivered.has(snapshot.id)) continue;
          const result = await options.deliver(text);
          if (!result.widgetUpdated) throw new Error(result.message ?? `Delivery was ${result.status}.`);
          delivered.set(snapshot.id, snapshot.exportedAt); errors.delete(filename);
          if (delivered.size > 1024) delivered.delete(delivered.keys().next().value!);
          options.log(`${result.status}: ${snapshot.tag} · exported ${new Date(snapshot.exportedAt).toISOString()}`);
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Delivery failed.';
          if (errors.get(filename) !== message) { options.log(`${filename}: ${message} Will retry.`); errors.set(filename, message); }
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

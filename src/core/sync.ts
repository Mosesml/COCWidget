import { currentSnapshot } from './catalogue';
import { parseExport, stable } from './import';
import type { Workspace } from './types';
import { acceptSnapshot } from './workspace';
import { widgetProjection, type WidgetProjection } from './widgets';

export interface SyncRequest {
  requestId: string;
  text?: string;
  clipboard: boolean;
  file?: boolean;
  background: boolean;
  notBefore?: number;
  expectedTag?: string;
  token?: string;
}
export type SyncStatus = 'updated' | 'unchanged' | 'ignored_older' | 'disabled' | 'failed';
export interface SyncResult {
  requestId: string; status: SyncStatus; widgetUpdated: boolean;
  tag?: string; exportedAt?: number; completedAt: number; message?: string;
}
export function parseSyncLink(link: string): SyncRequest | null {
  if (link.length > 3_100_000) throw new Error('Sync link exceeds the supported size.');
  let url: URL;
  try { url = new URL(link); } catch { return null; }
  if (url.protocol !== 'cocwidget:' || !['sync', 'import', 'sync-clipboard', 'sync-file'].includes(url.hostname)) return null;
  if (url.username || url.password || url.port || (url.pathname && url.pathname !== '/') || url.hash) throw new Error('Invalid sync link address.');
  for (const key of new Set(url.searchParams.keys())) if (url.searchParams.getAll(key).length !== 1) throw new Error('Duplicate sync link parameter.');
  const requestId = url.searchParams.get('requestId') ?? `local-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  if (!/^[a-zA-Z0-9_-]{1,80}$/.test(requestId)) throw new Error('Invalid sync request ID.');
  const clipboard = url.hostname === 'sync-clipboard';
  const file = url.hostname === 'sync-file';
  const text = url.searchParams.get('data') ?? undefined;
  if ((clipboard || file) && text !== undefined) throw new Error('Choose a single sync data source.');
  const token = url.searchParams.get('token') ?? undefined;
  if (token !== undefined && !/^[a-f0-9]{64}$/.test(token)) throw new Error('Invalid automation pairing code.');
  if (!clipboard && !file && (!text || text.length > 1_000_000)) throw new Error('A sync link needs a village export of at most 1 MB.');
  const rawTime = url.searchParams.get('notBefore');
  const notBefore = rawTime === null ? undefined : Number(rawTime) * 1000;
  if (notBefore !== undefined && (!Number.isSafeInteger(notBefore) || notBefore < 946684800000 || notBefore > 4102444800000)) throw new Error('Invalid export freshness requirement.');
  const expectedTag = url.searchParams.get('tag')?.toUpperCase();
  if (expectedTag && !/^#[A-Z0-9]{3,20}$/.test(expectedTag)) throw new Error('Invalid expected village tag.');
  return { requestId, text, clipboard, file, background: url.searchParams.get('background') === '1', notBefore, expectedTag, token };
}
export function syncLink(text: string, requestId: string, background = false, token?: string) {
  return `cocwidget://sync?requestId=${encodeURIComponent(requestId)}&background=${background ? '1' : '0'}${token ? `&token=${encodeURIComponent(token)}` : ''}&data=${encodeURIComponent(text)}`;
}
export function applySync(workspace: Workspace, text: string, now = Date.now(), constraints: Pick<SyncRequest, 'notBefore' | 'expectedTag'> = {}) {
  const snapshot = parseExport(text, now);
  if (constraints.notBefore && snapshot.exportedAt < constraints.notBefore) throw new Error('The clipboard export is not fresh. The game export step did not produce new JSON.');
  if (constraints.expectedTag && snapshot.tag !== constraints.expectedTag) throw new Error('The exported village does not match the configured player tag.');
  const existing = workspace.accounts.find(account => account.tag === snapshot.tag);
  if (existing) {
    const previous = currentSnapshot(existing);
    if (snapshot.exportedAt < previous.exportedAt) return { workspace, snapshot: previous, status: 'ignored_older' as const };
    if (snapshot.exportedAt === previous.exportedAt && stable(snapshot.raw) === stable(previous.raw)) {
      return { workspace, snapshot: previous, status: 'unchanged' as const };
    }
  }
  const accepted = acceptSnapshot(workspace, snapshot);
  // A background import must not change the account currently being configured in the app.
  return { workspace: { ...accepted, activeTag: workspace.activeTag ?? snapshot.tag }, snapshot, status: 'updated' as const };
}

export interface SyncDependencies {
  enabled: () => boolean;
  authorize: (request: SyncRequest) => boolean;
  commit: (mutate: (workspace: Workspace) => Workspace) => Promise<Workspace>;
  replace?: (workspace: Workspace) => Promise<Workspace>;
  publish: (projection: WidgetProjection) => Promise<{ available: boolean }>;
  clipboard: () => Promise<string>;
  readFile?: (requestId: string) => Promise<string>;
  report: (result: SyncResult) => Promise<void>;
  now?: () => number;
}
/** Saves before publishing, acknowledges after publishing, and makes retries idempotent. */
export class SyncCoordinator {
  private pending: Promise<unknown> = Promise.resolve();
  constructor(private readonly dependencies: SyncDependencies) {}
  private enqueue<T>(operation: () => Promise<T>): Promise<T> {
    const next = this.pending.catch(() => {}).then(operation);
    this.pending = next;
    return next;
  }
  receive(request: SyncRequest, manual = false): Promise<SyncResult> {
    return this.enqueue(async () => {
      const { dependencies: d } = this;
      const now = d.now?.() ?? Date.now();
      let result: SyncResult;
      if (!manual && !d.enabled()) result = { requestId: request.requestId, status: 'disabled', widgetUpdated: false,
        completedAt: now, message: 'Enable automatic imports once in COCWidget, then retry.' };
      else if (!manual && !d.authorize(request)) result = { requestId: request.requestId, status: 'failed', widgetUpdated: false,
        completedAt: now, message: 'Automation pairing code is missing or incorrect. Copy it from COCWidget settings.' };
      else {
        try {
          const text = request.file ? await d.readFile?.(request.requestId) : request.clipboard ? await d.clipboard() : request.text;
          if (!text) throw new Error('The incoming export could not be read.');
          let outcome: ReturnType<typeof applySync> | undefined;
          const workspace = await d.commit(current => {
            outcome = applySync(current, text, now, request);
            return outcome.workspace;
          });
          const publication = await d.publish(widgetProjection(workspace, now));
          if (!publication.available) throw new Error('The native widget bridge is unavailable. Install a native build, then retry.');
          result = { requestId: request.requestId, status: outcome!.status, widgetUpdated: true,
            tag: outcome!.snapshot.tag, exportedAt: outcome!.snapshot.exportedAt, completedAt: d.now?.() ?? Date.now() };
        } catch (error) {
          result = { requestId: request.requestId, status: 'failed', widgetUpdated: false,
            completedAt: d.now?.() ?? Date.now(), message: error instanceof Error ? error.message.slice(0, 240) : 'Sync failed.' };
        }
      }
      await d.report(result);
      return result;
    });
  }
  update(mutate: (workspace: Workspace) => Workspace) {
    return this.enqueue(async () => {
      const workspace = await this.dependencies.commit(mutate);
      const publication = await this.dependencies.publish(widgetProjection(workspace, this.dependencies.now?.() ?? Date.now()));
      if (!publication.available) throw new Error('Install a native build to update home-screen widgets.');
      return workspace;
    });
  }
  refresh() { return this.update(workspace => workspace); }
  replace(workspace: Workspace) {
    return this.enqueue(async () => {
      const saved = this.dependencies.replace ? await this.dependencies.replace(workspace) : await this.dependencies.commit(() => workspace);
      const publication = await this.dependencies.publish(widgetProjection(saved, this.dependencies.now?.() ?? Date.now()));
      if (!publication.available) throw new Error('Install a native build to update home-screen widgets.');
      return saved;
    });
  }
}

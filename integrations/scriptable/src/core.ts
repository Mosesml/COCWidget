import { parseExport } from '../../../src/core/import';
import { applySync } from '../../../src/core/sync';
import { acceptSnapshot, emptyWorkspace } from '../../../src/core/workspace';
import { widgetProjection, type WidgetAccount } from '../../../src/core/widgets';

export { parseExport };
export function prepareImport(text: string, previousText?: string, now = Date.now()) {
  const base = previousText ? acceptSnapshot(emptyWorkspace(), parseExport(previousText, now)) : emptyWorkspace();
  const result = applySync(base, text, now);
  const account = widgetProjection(result.workspace, now).accounts.find(item => item.tag === result.snapshot.tag)!;
  return { status: result.status, raw: JSON.stringify(result.snapshot.raw), account };
}
export function selectAccounts(accounts: WidgetAccount[], parameter: string) {
  const tag = parameter.trim().toUpperCase();
  if (!tag || tag === 'ALL') return accounts;
  if (!/^#[A-Z0-9]{3,20}$/.test(tag)) throw new Error('Widget parameter must be a player tag such as #ABC123, or all.');
  const account = accounts.find(item => item.tag === tag);
  if (!account) throw new Error('Village not saved. Import it, or edit the widget parameter.');
  return [account];
}

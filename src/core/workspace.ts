import { currentSnapshot } from './catalogue';
import { parseExport } from './import';
import type { Account, Preferences, Snapshot, Workspace } from './types';

export const defaults = (builders = 6): Preferences => ({ goal: 'army', armyId: 'dragons', builders,
  builderBaseBuilders: 2, onlineStart: 8, onlineEnd: 23, discount: 0, warDate: '', protectHeroes: true,
  ore: { shiny_ore: 0, glowy_ore: 0, starry_ore: 0 }, equipmentTargets: {}, queue: [] });
export const emptyWorkspace = (): Workspace => ({ version: 1, activeTag: null, accounts: [] });
export function acceptSnapshot(workspace: Workspace, snapshot: Snapshot, name?: string): Workspace {
  const existing = workspace.accounts.find(account => account.tag === snapshot.tag);
  if (existing) {
    const current = currentSnapshot(existing);
    if (snapshot.exportedAt < current.exportedAt) throw new Error('This export is older than the saved snapshot. Keep your newer data.');
    if (JSON.stringify(snapshot.raw) === JSON.stringify(current.raw) || snapshot.id === current.id) throw new Error('This exact snapshot is already saved.');
    if (snapshot.exportedAt === current.exportedAt) throw new Error('A different snapshot already exists at this timestamp. Export fresh data from the game.');
  }
  const account: Account = existing ? { ...existing, name: name?.trim() || existing.name,
    snapshots: [...existing.snapshots, snapshot].slice(-60), preferences: { ...existing.preferences, queue: [] } } :
    { tag: snapshot.tag, name: name?.trim() || snapshot.tag, demo: false, snapshots: [snapshot], preferences: defaults(snapshot.builders) };
  return { ...workspace, activeTag: snapshot.tag, accounts: [...workspace.accounts.filter(a => a.tag !== snapshot.tag), account] };
}
export function updateAccount(workspace: Workspace, tag: string, patch: Partial<Preferences>): Workspace {
  return { ...workspace, accounts: workspace.accounts.map(account => account.tag === tag ?
    { ...account, preferences: { ...account.preferences, ...patch } } : account) };
}
export function deleteAccount(workspace: Workspace, tag: string): Workspace {
  const accounts = workspace.accounts.filter(account => account.tag !== tag);
  return { ...workspace, accounts, activeTag: workspace.activeTag === tag ? accounts[0]?.tag ?? null : workspace.activeTag };
}
export function encodeBackup(workspace: Workspace) {
  return JSON.stringify({ format: 'cocwidget-backup', version: 1, workspace }, null, 2);
}
export function decodeBackup(text: string, now = Date.now()): Workspace {
  if (text.length > 20_000_000) throw new Error('Backup exceeds the 20 MB limit.');
  const backup = JSON.parse(text);
  if (backup?.format !== 'cocwidget-backup' || backup.version !== 1 || !Array.isArray(backup.workspace?.accounts)) throw new Error('This is not a supported COCWidget backup.');
  if (backup.workspace.accounts.length > 25) throw new Error('A backup can contain up to 25 villages.');
  const tags = new Set<string>();
  const accounts: Account[] = backup.workspace.accounts.map((account: Account) => {
    if (!account || typeof account.name !== 'string' || !Array.isArray(account.snapshots) || !account.snapshots.length || account.snapshots.length > 60) throw new Error('A backup village is invalid.');
    const snapshots = account.snapshots.map(snapshot => parseExport(JSON.stringify(snapshot.raw), now)).sort((a, b) => a.exportedAt - b.exportedAt);
    const tag = snapshots[0]!.tag;
    if (tags.has(tag) || snapshots.some(s => s.tag !== tag) || tag !== account.tag) throw new Error('A backup has duplicate or mismatched villages.');
    tags.add(tag);
    const preferences = validatePreferences(account.preferences, snapshots[snapshots.length - 1]!.builders);
    return { tag, name: account.name.slice(0, 60), demo: account.demo === true, snapshots, preferences };
  });
  return { version: 1, accounts, activeTag: accounts.some(a => a.tag === backup.workspace.activeTag) ? backup.workspace.activeTag : accounts[0]?.tag ?? null };
}
export function validatePreferences(input: Partial<Preferences>, builders = 6): Preferences {
  const result = { ...defaults(builders), ...input };
  if (!['army', 'max', 'war'].includes(result.goal) || typeof result.armyId !== 'string') throw new Error('Invalid goal preferences.');
  for (const [key, min, max] of [['builders', 1, 6], ['builderBaseBuilders', 1, 3], ['onlineStart', 0, 23], ['onlineEnd', 0, 23], ['discount', 0, 20]] as const) {
    if (!Number.isInteger(result[key]) || result[key] < min || result[key] > max) throw new Error(`Invalid ${key} preference.`);
  }
  if (typeof result.protectHeroes !== 'boolean' || typeof result.warDate !== 'string' || result.warDate.length > 32) throw new Error('Invalid war preferences.');
  for (const key of ['shiny_ore', 'glowy_ore', 'starry_ore'] as const) if (!Number.isSafeInteger(result.ore?.[key]) || result.ore[key] < 0) throw new Error('Ore balances must be positive whole numbers.');
  if (!Array.isArray(result.queue) || result.queue.length > 300 || result.queue.some(key => typeof key !== 'string')) throw new Error('Invalid plan queue.');
  if (!result.equipmentTargets || typeof result.equipmentTargets !== 'object' || Object.values(result.equipmentTargets).some(n => !Number.isInteger(n) || n < 1 || n > 99)) throw new Error('Invalid equipment targets.');
  return result;
}

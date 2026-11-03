import { decodeBackup, emptyWorkspace, encodeBackup } from './workspace';
import type { Workspace } from './types';

export const workspacePointerKey = '@cocwidget/workspace-file-v1';
export const legacyWorkspaceKey = '@cocwidget/workspace-v1';
const validName = (name: string) => /^[a-z0-9-]{1,80}\.json$/.test(name);
export interface WorkspaceIO {
  get: (key: string) => Promise<string | null>;
  set: (key: string, value: string) => Promise<void>;
  remove: (key: string) => Promise<void>;
  read: (name: string) => Promise<string>;
  write: (name: string, text: string) => Promise<void>;
  unlink: (name: string) => Promise<void>;
  identifier: () => string;
}
/** Immutable generations avoid AsyncStorage's large-value limit and replacement gaps. */
export class WorkspaceRepository {
  constructor(private readonly io: WorkspaceIO) {}
  async load(): Promise<Workspace> {
    const pointer = await this.io.get(workspacePointerKey);
    if (pointer !== null) {
      if (!validName(pointer)) throw new Error('Invalid saved workspace pointer.');
      return decodeBackup(await this.io.read(pointer));
    }
    const legacy = await this.io.get(legacyWorkspaceKey);
    if (!legacy) return emptyWorkspace();
    const workspace = decodeBackup(legacy);
    await this.save(workspace);
    return workspace;
  }
  async save(workspace: Workspace) {
    const text = encodeBackup(workspace);
    const name = `${this.io.identifier()}.json`;
    if (!validName(name)) throw new Error('Invalid workspace generation name.');
    const previous = await this.io.get(workspacePointerKey);
    if (previous === name) throw new Error('Workspace generation name must be unique.');
    // A failed/partial write never replaces the last acknowledged generation.
    await this.io.write(name, text);
    await this.io.set(workspacePointerKey, name);
    // Cleanup failure does not turn an already committed save into a failed import.
    if (previous && validName(previous)) await this.io.unlink(previous).catch(() => {});
    await this.io.remove(legacyWorkspaceKey).catch(() => {});
    return workspace;
  }
}

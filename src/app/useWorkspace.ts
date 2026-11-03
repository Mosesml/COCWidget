import { useCallback, useEffect, useRef, useState } from 'react';
import { updateAccount } from '../core/workspace';
import type { Preferences, Workspace } from '../core/types';
import { workspaceStorage } from './workspaceStorage';

export function useWorkspace() {
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [error, setError] = useState('');
  const current = useRef<Workspace | null>(null);
  const writes = useRef<Promise<unknown>>(Promise.resolve());
  useEffect(() => {
    let active = true;
    workspaceStorage.load().then(value => {
      if (active) { current.current = value; setWorkspace(value); }
    }).catch(() => {
      if (active) setError('Your saved data could not be read. It has been kept intact. Restore a backup, or explicitly reset this device.');
    });
    return () => { active = false; };
  }, []);
  const commit = useCallback((mutate: (value: Workspace) => Workspace) => {
    const next = writes.current.catch(() => {}).then(async () => {
      if (!current.current) throw new Error('Workspace is not ready.');
      const value = mutate(current.current);
      if (value !== current.current) await workspaceStorage.save(value);
      current.current = value; setWorkspace(value); return value;
    });
    writes.current = next; return next;
  }, []);
  const replace = useCallback((value: Workspace) => {
    const next = writes.current.catch(() => {}).then(async () => {
      await workspaceStorage.save(value);
      current.current = value; setWorkspace(value); setError('');
      return value;
    });
    writes.current = next; return next;
  }, []);
  const preferences = useCallback((tag: string, patch: Partial<Preferences>) => commit(value => updateAccount(value, tag, patch)), [commit]);
  return { workspace, commit, replace, preferences, error };
}

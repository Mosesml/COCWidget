import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useRef, useState } from 'react';
import { demoWorkspace } from '../data/demo';
import { decodeBackup, encodeBackup, updateAccount } from '../core/workspace';
import type { Preferences, Workspace } from '../core/types';

const key = '@cocwidget/workspace-v1';
export function useWorkspace() {
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [error, setError] = useState('');
  const current = useRef<Workspace | null>(null);
  const writes = useRef<Promise<unknown>>(Promise.resolve());
  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(key).then(text => {
      const value = text ? decodeBackup(text) : demoWorkspace();
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
      await AsyncStorage.setItem(key, encodeBackup(value));
      current.current = value; setWorkspace(value); return value;
    });
    writes.current = next; return next;
  }, []);
  const replace = useCallback(async (value: Workspace) => {
    await writes.current.catch(() => {});
    await AsyncStorage.setItem(key, encodeBackup(value));
    current.current = value; setWorkspace(value); setError('');
  }, []);
  const preferences = useCallback((tag: string, patch: Partial<Preferences>) => commit(value => updateAccount(value, tag, patch)), [commit]);
  return { workspace, commit, replace, preferences, error };
}

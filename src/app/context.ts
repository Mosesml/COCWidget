import { createContext, useContext } from 'react';
import type { Account, Candidate, Plan, Preferences, Snapshot, Workspace } from '../core/types';

export type Page = 'today' | 'army' | 'plan' | 'equipment' | 'progress';
export interface AppContextValue {
  workspace: Workspace; account: Account; snapshot: Snapshot; now: number; wide: boolean;
  candidates: Candidate[]; plan: Plan; navigate: (page: Page) => void;
  preferences: (patch: Partial<Preferences>) => Promise<unknown>;
  queue: (candidate: Candidate) => void; notify: (message: string) => void;
  details: (candidate: Candidate) => void; importVillage: () => void;
  settings: () => void; widgets: () => void; inventory: () => void; magic: () => void;
}
export const AppContext = createContext<AppContextValue | null>(null);
export function useApp() { const value = useContext(AppContext); if (!value) throw new Error('Application context is missing'); return value; }

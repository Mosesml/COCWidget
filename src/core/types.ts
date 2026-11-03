export type Village = 'home' | 'builder' | 'shared';
export type Kind = 'building' | 'trap' | 'troop' | 'spell' | 'hero' | 'pet' | 'equipment' |
  'guardian' | 'helper' | 'skin' | 'scenery' | 'decoration' | 'obstacle' | 'housePart' | 'module' | 'unknown';
export type Json = null | boolean | number | string | Json[] | { [key: string]: Json };
export type JsonObject = { [key: string]: Json };
export type Cost = Record<string, number>;
export type Requirements = { townHall: number; lab?: number; heroHall?: number; petHouse?: number; blacksmith?: number };
export interface Level {
  level: number; requirements: Requirements; stats: Record<string, number>;
  abilities: Record<string, Json>[]; costToNext: Cost; secondsToNext: number | null;
  mergeRequirement?: Json; unlocks?: Json;
}
export interface CatalogueItem {
  id: number; name: string; kind: Kind; village: Village; resource?: string;
  description?: string; hero?: string; rarity?: string; category?: string;
  productionBuilding?: string; productionBuildingLevel?: number;
  seasonal?: boolean; superTroop?: boolean; housingSpace?: number; levels: Level[];
}
export interface Entity {
  key: string; id: number; name: string; known: boolean; section: string; village: Village; kind: Kind;
  level: number | null; count: number; timer?: number; extra: boolean; parentKey?: string;
  supercharge?: number; weapon?: number; gearUp?: number; helperTimer?: number;
  helperRecurrent: boolean; raw: JsonObject;
}
export interface Snapshot {
  id: string; tag: string; exportedAt: number; importedAt: number; townHall: number; builderHall: number;
  builders: number; entities: Entity[]; sections: string[]; boosts: JsonObject;
  warnings: string[]; raw: JsonObject;
}
export type Lane = 'builder' | 'lab' | 'pet' | 'builderBase' | 'starLab';
export type Goal = 'army' | 'max' | 'war';
export interface Preferences {
  goal: Goal; armyId: string; builders: number; builderBaseBuilders: number;
  onlineStart: number; onlineEnd: number; discount: number; warDate: string; protectHeroes: boolean;
  ore: { shiny_ore: number; glowy_ore: number; starry_ore: number };
  equipmentTargets: Record<string, number>; queue: string[];
}
export interface Account { tag: string; name: string; demo: boolean; snapshots: Snapshot[]; preferences: Preferences }
export interface Workspace { version: 1; activeTag: string | null; accounts: Account[] }
export interface Candidate {
  key: string; entity: Entity; item: CatalogueItem; from: number; to: number; seconds: number;
  cost: Cost; lane: Lane | 'instant'; score: number; reasons: string[]; blockers: string[];
}
export interface ScheduledStep {
  key: string; name: string; entityKey: string; from: number; to: number; lane: Lane;
  worker: number; start: number; end: number; cost: Cost; existing: boolean; reason: string;
}
export interface Plan { steps: ScheduledStep[]; deferred: { name: string; reason: string }[]; costs: Cost; assumptions: string[] }

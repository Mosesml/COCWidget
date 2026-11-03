import { lookup } from './catalogue';
import type { Entity, Json, JsonObject, Kind, Snapshot, Village } from './types';

const sections: Record<string, [Kind, Village]> = {
  buildings: ['building', 'home'], traps: ['trap', 'home'], units: ['troop', 'home'],
  siege_machines: ['troop', 'home'], heroes: ['hero', 'home'], spells: ['spell', 'home'],
  pets: ['pet', 'home'], equipment: ['equipment', 'home'], guardians: ['guardian', 'home'],
  helpers: ['helper', 'shared'], buildings2: ['building', 'builder'], traps2: ['trap', 'builder'],
  units2: ['troop', 'builder'], heroes2: ['hero', 'builder'], decos: ['decoration', 'home'],
  decos2: ['decoration', 'builder'], obstacles: ['obstacle', 'home'], obstacles2: ['obstacle', 'builder'],
  skins: ['skin', 'home'], skins2: ['skin', 'builder'], sceneries: ['scenery', 'home'],
  sceneries2: ['scenery', 'builder'], house_parts: ['housePart', 'shared'],
};
const isObject = (x: unknown): x is JsonObject => x !== null && typeof x === 'object' && !Array.isArray(x);
const whole = (x: unknown, min = 0): x is number => typeof x === 'number' && Number.isSafeInteger(x) && x >= min;
function integerField(row: JsonObject, name: string, min: number, max: number, path: string): number | undefined {
  const value = row[name];
  if (value === undefined) return;
  if (!whole(value, min) || value > max) throw new Error(`${path}.${name} must be a whole number between ${min} and ${max}.`);
  return value;
}
function stable(value: Json): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (isObject(value)) return `{${Object.keys(value).sort().map(k => `${JSON.stringify(k)}:${stable(value[k]!)}`).join(',')}}`;
  return JSON.stringify(value);
}
export function fingerprint(value: Json): string {
  let hash = 2166136261;
  for (const char of stable(value)) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return (hash >>> 0).toString(16).padStart(8, '0');
}

export function parseExport(text: string, now = Date.now()): Snapshot {
  if (text.length > 1_000_000) throw new Error('This export is too large. The limit is 1 MB.');
  let raw: unknown;
  try { raw = JSON.parse(text); } catch { throw new Error('That is not valid JSON. Copy the complete village export from the game.'); }
  if (!isObject(raw)) throw new Error('Paste a single village export object.');
  if (typeof raw.tag !== 'string' || !/^#[A-Z0-9]{3,20}$/i.test(raw.tag)) throw new Error('The export needs a valid player tag.');
  if (!whole(raw.timestamp, 946684800) || raw.timestamp > 4102444800) throw new Error('The export needs a valid timestamp in seconds.');
  const exportedAt = raw.timestamp * 1000;
  if (exportedAt > now + 300_000) throw new Error('This export is dated in the future. Check your device clock.');
  if (!Array.isArray(raw.buildings)) throw new Error('Buildings are missing. Use the in-game village export, rather than player API JSON.');
  if (raw.boosts !== undefined && !isObject(raw.boosts)) throw new Error('boosts must be a JSON object.');
  const entities: Entity[] = [], warnings: string[] = [];
  const seenSections: string[] = [];
  const unknown = new Set<number>();
  const visit = (value: Json, section: string, path: string, kind: Kind, village: Village, parentKey?: string) => {
    if (entities.length > 10_000) throw new Error('Too many inventory entries.');
    if (Array.isArray(value)) { value.forEach((row, index) => visit(row, section, `${path}[${index}]`, kind, village, parentKey)); return; }
    if (whole(value, 1)) value = { data: value };
    if (!isObject(value)) throw new Error(`${path} must be an inventory object or ID.`);
    const id = integerField(value, 'data', 1, 2147483647, path);
    if (id === undefined) throw new Error(`${path} has no game data ID.`);
    const level = integerField(value, 'lvl', 0, 999, path) ?? null;
    const count = integerField(value, 'cnt', 1, 10000, path) ?? 1;
    const timer = integerField(value, 'timer', 0, 366 * 86400, path);
    if (timer !== undefined && count !== 1) throw new Error(`${path}: an active timer cannot describe multiple indistinguishable items.`);
    for (const flag of ['extra', 'helper_recurrent']) if (value[flag] !== undefined && typeof value[flag] !== 'boolean') throw new Error(`${path}.${flag} must be true or false.`);
    const item = lookup(id); if (!item) unknown.add(id);
    const key = `${section}:${path}`;
    entities.push({ key, id, name: item?.name ?? `Unknown item ${id}`, known: !!item, section, village,
      kind: parentKey ? 'module' : kind, level, count, timer, extra: value.extra === true,
      parentKey, supercharge: integerField(value, 'supercharge', 0, 99, path),
      weapon: integerField(value, 'weapon', 0, 99, path), gearUp: integerField(value, 'gear_up', 0, 99, path),
      helperTimer: integerField(value, 'helper_timer', 0, 86400, path), helperRecurrent: value.helper_recurrent === true, raw: value });
    for (const nested of ['types', 'modules']) if (value[nested] !== undefined) {
      if (!Array.isArray(value[nested])) throw new Error(`${path}.${nested} must be an array.`);
      visit(value[nested]!, section, `${path}.${nested}`, 'module', village, key);
    }
  };
  for (const [section, value] of Object.entries(raw)) {
    if (!sections[section]) {
      if (Array.isArray(value) && value.some(row => isObject(row) && whole(row.data, 1))) {
        seenSections.push(section); visit(value, section, section, 'unknown', 'shared');
        warnings.push(`New inventory section ${section} was preserved. Its worker rules are unknown.`);
      }
      continue;
    }
    if (!Array.isArray(value)) throw new Error(`${section} must be an array.`);
    seenSections.push(section); const [kind, village] = sections[section]!;
    visit(value, section, section, kind, village);
  }
  const levelOf = (id: number) => Math.max(0, ...entities.filter(e => e.id === id).map(e => e.level ?? 0));
  if (!levelOf(1000001)) throw new Error('No Town Hall was found in buildings. Copy the complete village export.');
  const huts = entities.filter(e => e.id === 1000015).reduce((n, e) => n + e.count, 0);
  const bob = entities.some(e => e.id === 1000064) || levelOf(1000065) >= 5 ? 1 : 0;
  if (unknown.size) warnings.push(`${unknown.size} item IDs have no catalogue name; their full data was kept.`);
  if (now - exportedAt > 86400000) warnings.push('This snapshot is over a day old. Import again after changes in-game.');
  if (!raw.equipment) warnings.push('Equipment was not supplied in this export; it is unknown rather than empty.');
  return { id: `${raw.tag}:${raw.timestamp}:${fingerprint(raw)}`, tag: raw.tag.toUpperCase(), exportedAt,
    importedAt: now, townHall: levelOf(1000001), builderHall: levelOf(1000034),
    builders: huts ? huts + bob : 6, entities, sections: seenSections, boosts: (raw.boosts ?? {}) as JsonObject,
    warnings, raw };
}

export function importLink(text: string): string {
  return `cocwidget://import?data=${encodeURIComponent(text)}`;
}
export function exportFromLink(link: string): string | null {
  if (link.length > 3_100_000) throw new Error('Import link is too large. Use a JSON file instead.');
  let url: URL;
  try { url = new URL(link); } catch { return null; }
  if (url.protocol !== 'cocwidget:' || url.hostname !== 'import') return null;
  const value = url.searchParams.get('data');
  if (!value) throw new Error('The import link has no village data.');
  if (value.length > 1_000_000) throw new Error('Village data exceeds the 1 MB limit.');
  return value;
}

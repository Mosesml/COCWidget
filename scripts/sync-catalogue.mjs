import { mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const commit = '82887e25ff520a522d5d673619a9277f276a3327';
const source = `https://raw.githubusercontent.com/ClashKingInc/ClashKingAssets/${commit}`;
const tables = {
  buildings: 'building', traps: 'trap', troops: 'troop', spells: 'spell', heroes: 'hero',
  pets: 'pet', equipment: 'equipment', guardians: 'guardian', helpers: 'helper',
  skins: 'skin', sceneries: 'scenery', decorations: 'decoration', obstacles: 'obstacle',
  capital_house_parts: 'housePart',
};
const items = [];
const hashes = {};
for (const [table, kind] of Object.entries(tables)) {
  const response = await fetch(`${source}/assets/static_data/${table}.json`);
  if (!response.ok) throw new Error(`${table}: HTTP ${response.status}`);
  const text = await response.text();
  hashes[table] = createHash('sha256').update(text).digest('hex');
  for (const raw of JSON.parse(text).items) {
    const levels = (raw.levels ?? []).sort((a, b) => a.level - b.level);
    const incoming = kind === 'building' || kind === 'trap';
    const resource = raw.upgrade_resource ?? (kind === 'equipment' ? 'Ore' : undefined);
    items.push({
      id: raw._id, name: raw.name, kind, resource,
      village: raw.village === 'builderBase' || raw.type === 'builderBase' ? 'builder' :
        ['helper', 'housePart'].includes(kind) ? 'shared' : 'home',
      description: raw.info, hero: raw.hero ?? raw.character, rarity: raw.rarity ?? raw.tier,
      category: raw.type, housingSpace: raw.housing_space,
      productionBuilding: raw.production_building, productionBuildingLevel: raw.production_building_level,
      seasonal: !!raw.is_seasonal, superTroop: !!raw.super_troop,
      levels: levels.map((row, index) => {
        const next = levels[index + 1];
        const paid = incoming ? next : row;
        const rawCost = next ? (incoming ? paid.build_cost : paid.upgrade_cost) : undefined;
        const costToNext = typeof rawCost === 'object' && rawCost !== null ? rawCost :
          typeof rawCost === 'number' && resource ? { [resource]: rawCost } : {};
        const seconds = next ? (incoming ? paid.build_time : paid.upgrade_time) : null;
        return {
          level: row.level,
          requirements: {
            townHall: row.required_townhall ?? 1, lab: row.required_lab_level,
            heroHall: row.required_hero_tavern_level, petHouse: row.required_pet_house_level,
            blacksmith: row.required_blacksmith_level,
          },
          stats: Object.fromEntries(['hitpoints', 'dps', 'damage', 'heal_on_activation', 'duration', 'radius', 'death_damage']
            .filter(key => typeof row[key] === 'number').map(key => [key, row[key]])),
          abilities: row.abilities ?? [], costToNext,
          secondsToNext: kind === 'equipment' || kind === 'helper' ? 0 :
            typeof seconds === 'number' && seconds >= 0 ? seconds : null,
          mergeRequirement: row.merge_requirement, unlocks: row.unlocks,
        };
      }),
    });
  }
}
await mkdir(new URL('../src/data/', import.meta.url), { recursive: true });
await writeFile(new URL('../src/data/catalogue.json', import.meta.url), JSON.stringify({
  schemaVersion: 1,
  source: { name: 'ClashKing Assets', url: 'https://assets.clashk.ing', commit, hashes,
    normalization: 'Buildings/traps use the destination row; units/equipment use the source row for outgoing cost/time. Requirements and stats describe their own row. Not independently certified against all live game values.' },
  items,
}));
console.log(`Wrote ${items.length} catalogue entities from ${commit}.`);

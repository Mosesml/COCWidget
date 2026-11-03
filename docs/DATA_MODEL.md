# Data model and catalogue conventions

The domain layer is independent of React Native. The original export is preserved on every snapshot; decoded entity rows are a projection, never the source of truth. A snapshot records both exportedAt and importedAt, exact observed sections, unknown-ID warnings and nested parent paths.

## Facts and identity

- `cnt` represents grouped objects at the same level; omitted count means one. Individual copies have no stable ID or coordinates.
- Nested crafted-defense types and modules are visited recursively; timers inside modules are retained even when their names are unresolved.
- Missing arrays mean unknown inventory. History compares common sections and level distributions, not row positions or inferred individual building identities.
- `extra` identifies the extra worker/research slot in known contexts. Supercharges and weapon flags remain distinct from ordinary levels.
- An expired forecast is displayed as expected ready, not a confirmed new level.
- Snapshot history is capped at 60 entries per village. A replacement import clears stale queue references while retaining that village's preferences and history.

## Catalogue

Source: [ClashKing Assets](https://assets.clashk.ing), pinned to commit `82887e25ff520a522d5d673619a9277f276a3327`. `npm run data:sync` downloads specified public tables, records hashes and rebuilds `src/data/catalogue.json`. The catalogue is attributed in the app and third-party notices.

The source generator exposes raw game row conventions. Buildings and traps store the price/time for reaching their row's level; troops, heroes, pets, spells and equipment store outgoing upgrade prices/times. Normalization converts each owned level into `costToNext` and `secondsToNext`, using destination rows for buildings/traps and source rows for other upgrade categories. Requirements and combat stats remain attached to their own level. Equipment level 1 → 3 therefore sums the level-1 and level-2 outgoing ore prices. A source row with a missing duration is not treated as an instant upgrade.

This mapping has targeted regression checks; the full catalogue has not been independently certified against every live game value. Current-hall targets are based on catalogue requirements. Merge rules and special operations are preserved but not automatically scheduled. Storage affordability and future loot are not simulated.

## Time and planning

The reference fixture validates exported remaining work anchored to the export timestamp, with the active Builder Potion interval integrated at 10×. The time module integrates supported boost boundaries, keeps lab/pet/base categories separate and adds a currently exported Apprentice/Lab Assistant session. Future repeated assignments are not assumed. Other boost combinations require the real-export/device audit tracked in GOALS.md.

Future queued upgrades apply the user-selected duration/cost discount once. Existing imported timers do not receive this discount again. Builder, lab, pet, Builder Base and Star Laboratory lanes have independent worker availability. Existing extra-slot upgrades are reserved separately; hiring future Goblins is not assumed. The scheduler respects known level prerequisites, local online hours and an optional protected hero deadline. It defers unsupported work with a reason; it is a deterministic heuristic, not a globally optimal solver.

Resource costs are shown as catalogue estimates. No current resource balance, gem inventory or magic-item bag is inferred from the village JSON. Entered ore balances are manual. Magic-item comparisons report either one upgrade's calendar saving or summed worker time and label the measure.

## Source fixtures

`tests/fixtures/village-export.json` and `helper-export.json` are anonymized public fixtures from [chitti-a7r4/coc-tracker](https://github.com/chitti-a7r4/coc-tracker), commit `bfc032175fe1d87235e7e97f6fea5a75cf3a4d48`. They are not the owner's private exports. The sample workspace rebases synthetic timestamps and uses explicit demo identities.

## Workspace persistence boundary

Current snapshots/history are stored as immutable app-private JSON file generations, with a small AsyncStorage pointer committed after the generation write succeeds. This avoids the Android SQLite CursorWindow limit for a large single value. Readable old workspace values migrate once; an unreadable stored value/file is retained for explicit backup recovery. The compact backup format remains version 1, with a 20 MB UTF-8 bound. At most 25 villages and 60 snapshots per village are retained, subject to that total size bound. Unknown raw fields remain in every accepted snapshot.

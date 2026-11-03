# COCWidget product requirements

Status: functional foundation implemented; native validation and public-release work tracked in GOALS.md. Owner: Moses. Targets: iOS and Android, with a browser development preview.

## Problem and outcome

Clash players can export a rich snapshot of their village, but a list of countdowns does not tell them how to improve an army, spend scarce ore, or plan around their available playtime. COCWidget turns the full snapshot into an explained next action and keeps it visible in a native home-screen widget.

The first release covers five connected capabilities: army-based upgrade priorities, a practical upgrade plan, equipment spending guidance, progress reports, and multiple-account widgets.

## People and core flow

A player with one or several villages copies Settings → More Settings → Data Export in Clash of Clans. They paste or open the JSON in COCWidget, review the village and warnings, and save it locally. They choose an army/progression goal and available play hours. Today shows their next useful action and upcoming completions; deeper screens show the plan, ore targets and observed progress. New imports update the stored inventory and widget projection automatically.

## Functional requirements

### R1 — complete local inventory and import

- Parse full Home Village and Builder Base inventory, counted walls, equipment, helpers, special upgrades and nested crafted-defense modules.
- Preserve the original JSON and unknown fields; show unresolved IDs without discarding their timers.
- Validate sizes, types, timestamps, counts and identity before changing saved data. Import preview leaves existing data intact until saved.
- Prevent duplicate snapshots; reject older replacement snapshots; compare only categories present in both snapshots.
- Save multiple villages independently, with names, goals, plans and history keyed by player tag.
- Keep personal exports on-device. Sample mode must be clearly labeled and separate from imported villages.
- Export a local backup and restore it with validation. Deletion requires a clear explicit action.

### R2 — improve my army

- Offer curated army templates, with a clear disclaimer that these are editorial planning targets rather than measured battle-success predictions.
- Compare the village's troops, spells, heroes, pets and equipment to attainable targets.
- Explain each priority using army relevance, current level, prerequisite and duration information.
- Support offense, max-current-hall and war-readiness goals. A chosen war date protects selected heroes from overlapping planned downtime.

### R3 — practical upgrade plan

- Separate builder, laboratory, pet and Builder Base lanes. Heroes occupy appropriate builder capacity; walls have resource costs but no invented build duration.
- Respect prior levels, catalogue prerequisites and selected online hours. Expose unsupported requirements rather than invent a feasible schedule.
- Reserve already-running upgrades and explicitly separate expected completion from confirmed game state.
- Let the player queue/remove suggested upgrades, choose a daily play window, set builder/discount assumptions, and inspect resource totals.
- Present calendar time separately from summed worker time. Resource availability is assumed unless the player enters balances/income; never claim guaranteed affordability.
- Provide comparisons for Builder/Research Potions and Books of Building/Fighting, with known effects and assumptions visible. Hammers and additional items are follow-up work.

### R4 — equipment and ore

- Show owned equipment, hero, current/target level and ability changes from the versioned catalogue.
- Calculate shiny, glowy and starry ore costs to a chosen target using normalized and tested level-cost conventions.
- Accept manually entered ore balances, show deficits and persist targets per village.
- Prioritize items relevant to the selected army; distinguish catalogue breakpoints from editorial recommendations.

### R5 — progress reports

- Save snapshot history and compare aggregate level distributions, including walls and heroes.
- Show the observation window and missing-section caveat. Never equate missing data with demolished buildings.
- Show milestones, category changes and an exportable text report. Do not invent actual time played, loot earned or money spent.

### R6 — multiple-account widgets

- Publish native widget projections after accepted imports and relevant plan changes.
- Provide next-action, upcoming-completion and overview projections scoped to village tags.
- Preserve widget account selection when the app's active village changes; support an overview across saved villages.
- iOS uses platform timelines and configuration; Android uses supported widget updates. Both show freshness and absolute completion times.
- Widget rendering is based on locally saved snapshots and conditional forecasts; it does not imply a live game connection.

### R7 — low-friction handoff

- A user-initiated paste/file import works on both platforms.
- Provide a documented iOS Shortcut path: Get Clipboard → URL Encode → Open `cocwidget://import?data=…`. The app previews before saving.
- Provide an import link/clipboard helper for development and explain that the initial Copy action in the game is still necessary.
- Do not monitor the clipboard in the background, scrape game memory, or automate gameplay.
- Evaluate platform share extensions/App Intents separately; distinguish configured integration from physical-device verification.

## Design requirements

Lead with the next decision. Use a compact village switcher, warm paper surfaces, forest green with restrained amber accents, readable typography, consistent outline icons, tabular countdowns and 44-point touch targets. Game artwork is optional supporting context, not the page structure. Provide clear empty, invalid-import, stale-data, loading and recovery states. The app must work at phone and wide preview widths.

## Data and architecture

Use Expo/React Native with a pure TypeScript domain layer for parsing, catalogue access, recommendations, scheduling, ore arithmetic, history and widget projections. Persist snapshots locally through a versioned repository. Native widget layouts consume small serialized projections; the full raw export is not copied into a widget URL. A browser preview is for development and shares the app's real data logic.

Bundle a pinned, attributed game catalogue and a reproducible importer. Record source commit, normalization rules and limitations. Refuse unsupported data rather than presenting guessed exact prices. No API key is needed for the local first release. A later backend may add public clan/war API context; it cannot replace private building exports.

## Acceptance and verification

- Core regression tests cover counted/nested imports, unknown IDs, time anchoring, duplicate/old snapshots, partial comparisons, independent accounts, ore totals, scheduling and widget projections.
- Shared app type checks and produces a browser bundle.
- Interactive checks cover sample mode, switching villages, import preview/error, goal selection, queue edits, ore targets and progress views.
- Native project generation is checked independently from native compilation.
- Android widget/device validation and iOS widget/simulator validation are tracked separately. Store distribution requires the owner's platform signing accounts.

## Release boundaries

No automatic fresh game export, direct upgrade execution, base-layout grading, replay simulation, inferred resource balances or guaranteed global-optimum schedule. All five capabilities must have useful local behavior; device release readiness is a separate milestone from a functional app foundation.

## Sources

- Export research and normalized data conventions: [DATA_MODEL.md](DATA_MODEL.md).
- Reference project: https://github.com/chitti-a7r4/coc-tracker
- Data catalogue: https://github.com/ClashKingInc/ClashKingAssets
- Widget support: https://docs.expo.dev/versions/v58.0.0/sdk/widgets/
- Android clipboard limits: https://developer.android.com/about/versions/10/privacy/changes
- iOS paste interaction: https://developer.apple.com/documentation/uikit/uipastecontrol


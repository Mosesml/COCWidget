# COCWidget goals

Use `[x]` for implemented and checked behavior, `[ ]` for outstanding work. Native integrations require explicit device validation before being called release ready.

## G0 — project and scope

- [x] Confirm the only push destination is Mosesml/COCWidget and work on main.
- [x] Write a PRD with acceptance criteria for all five product capabilities.
- [x] Establish this goals area and a small-commit working agreement.
- [x] Bootstrap the shared iOS/Android app and repeatable checks.

## G1 — data foundation

- [x] Preserve complete exports, decode inventory and traverse nested modules.
- [x] Version and attribute the catalogue with explicit normalization rules.
- [x] Validate imports before saving and retain unknown fields/IDs.
- [x] Persist multiple villages, history, goals, queue and ore targets independently.
- [x] Verify raw preservation, timestamps, counts, partial snapshots and backup validation.

## G2 — improve my army

- [x] Army templates and explained upgrade priorities.
- [x] Goal selection and attainable research/equipment targets.
- [x] Readiness breakdown with supported prerequisites.

## G3 — practical plan

- [x] Queue editing and separate worker/research lanes.
- [x] Existing upgrades, dependencies, online hours and protected hero deadlines.
- [x] Resource totals and honest duration/affordability assumptions.
- [x] Supported magic-item and boost comparisons (two potions and two books).

## G4 — equipment and ore

- [x] Equipment inventory, level targets and catalogue ability breakpoints.
- [x] Ore costs, entered balances and deficits.
- [x] Persistent, army-aware spending priorities.

## G5 — progress

- [x] Snapshot history and aggregate level changes.
- [x] Wall/hero milestones and missing-section handling.
- [x] Share/export a readable progress report (native delivery still needs a device check).

## G6 — import and widgets

- [x] Paste/file preview and automatic widget projection after save.
- [x] Validated import deep links and an iOS Shortcut guide.
- [x] iOS native widget layouts and account configuration (source and generation checked).
- [x] Android native widget layouts and account-scoped projections (source and autolinking checked).
- [x] Overview across accounts and accurate snapshot-freshness labels.
- [ ] Complete native compilation and device validation.
- [ ] Verify iOS widget import/update on a simulator or physical device.
- [ ] Verify Android widget import/update on an emulator or physical device.

## G7 — usable application

- [x] Today, Army, Plan, Equipment and Progress screens with real behavior.
- [x] Responsive layout, accessible controls and import/empty/error states.
- [x] Backup/restore and explicit village deletion.
- [ ] Type check, domain tests, app bundle and interactive checks.
- [ ] CI, setup instructions, validation record and clean pushed commits.

## Later release work

- [ ] Audit each supported cost/duration/prerequisite against the current game.
- [ ] Real exports covering all speed effects and special operations.
- [ ] Additional launchers, accessibility font sizes and timezone/DST device checks.
- [ ] Signing, TestFlight/Play testing, store assets and public distribution.
- [ ] Optional public clan/war API service and share extensions/App Intents.

## Checkpoints

- Planning: PRD and working agreement committed before implementation.
- Core: full parser, catalogue normalization, account/history models, strategy, scheduler, ore calculations and boost projections pass 11 regression tests. Type checking and initial browser export pass. Interactive app screens are next.
- App: six browser flows pass across desktop and phone: planning, equipment persistence, history/accounts, valid/invalid imports, all five mobile screens, and corrupted-storage recovery. iOS app bundle exports, both native projects generate, and the Android per-instance module autolinks. Native device release readiness remains open.


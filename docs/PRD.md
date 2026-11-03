# COCWidget PRD

Owner: Moses. Current scope: **widget and automatic refresh first, Android first**, with a minimal black/white theme. The website and dashboard screens are removed. An optional iPhone Scriptable integration is implemented for device testing; native iOS distribution remains a separate milestone.

## Outcome

A player sees useful village countdowns, expected builder availability, next upgrade and snapshot freshness on a native home-screen widget. Once the source produces fresh JSON, delivery, validation, local save and widget publication run without a per-import Save prompt. A script must distinguish actual acknowledgement from merely opening an app.

## Android first release

1. Preserve and validate complete exports, including counted inventory, nested modules, unknown IDs and raw fields. Retain separate village histories/preferences. Persist full workspaces in app-private file generations with a committed pointer; migrate readable legacy data and recover unreadable workspaces through explicit backup restoration.
2. Native widget account configuration stays independent of imports and app account selection. Countdowns and estimated boundary changes work without a React screen running. Show absolute deadlines and source export age.
3. One-time Automatic imports setting plus revocable private pairing code. Only paired links/files/clipboard requests save and publish automatically; unpaired requests cannot read the clipboard or file. Manual import remains available for recovery.
4. File delivery handles the supported 1 MB size without an oversized shell URL. A request ID ties success to an acknowledgement after native publication. A lost acknowledgement can be retried idempotently.
5. Watch a file or directory, tolerate partial/atomic writes, retry delivery failures, skip acknowledged duplicates and preserve newer snapshots.
6. An optional connected-device export runner records the game's export menu, checks foreground/screen size, copies data and hands it to the app. Validate a fresh timestamp and optional expected village. Stop on failure. Support a repeat interval and graceful stop.
7. Calibration is device/layout-specific. The menu runner requires ADB, a running host and an unlocked device. Do not imply phone-only silent export. Real Clash menu behavior must be verified separately from a synthetic export fixture.
8. Minimal native setup, saved villages, import status and backup/recovery. No browser target, dashboard navigation, website assets or browser testing dependency.

## iOS next phase

- Retain SwiftUI/WidgetKit layout and App Group publication from the shared projection.
- Compile app and widget on full Xcode; test installation, account configuration, background timelines and import delivery on an iPhone.
- Native minimum OS: iOS/iPadOS 17, matching configurable WidgetKit App Intents. Native Shortcut handoff: copied JSON → URL Encode → Open `cocwidget://sync?token=PRIVATE_CODE&data=…`; with paired automation enabled, the receiver saves and publishes without an app Save prompt.
- Provide a standalone Scriptable script with the shared parser/catalogue, local complete exports, small widget caches, village selection and black/white layout. Shortcuts pass copied JSON directly as input; no native build/signing is needed for this alternative. Treat its saved acknowledgement as local persistence, never proof that iOS refreshed the Home Screen. Require physical iPhone verification before calling it supported.
- A personal automation can trigger handoff when Clash closes. This does not make Clash generate JSON. Investigate an official export intent/share path if one becomes available; do not claim it exists.
- Evaluate an App Intent/share extension for background-capable delivery, with actual device verification. No desktop watcher-to-iPhone delivery is implied by the Android ADB runner.

## Data usefulness retained

The domain layer still supports army relevance, upgrade prerequisites/scheduling, equipment/ore calculations and observed progress. These can inform widget projections and future widget families. Reintroducing a large app/dashboard is outside the present scope.

## Acceptance

- Domain/automation tests establish validation, serialized publication, duplicate/stale handling, retry after persistence/publication failure, source-freshness constraints and watched-file behavior.
- Actual Android device checks establish script → receiver → persistence → widget acknowledgement, widget update while the app returns to background, and timer boundary behavior.
- Export-menu driver tests using a development fixture are labeled synthetic. A successful synthetic test is not proof that a live Clash menu profile works.
- Native compilation, JavaScript bundling, device interaction, live-game export and distribution are separate milestones in GOALS.md and VALIDATION.md.
- Wrong pairing, oversized/deep JSON, malformed acknowledgements, newer/older collisions, large text, compact layouts and removed villages have explicit checks or documented verification gaps.
- Android support is version/ABI/launcher-specific; do not promise every Android device. See COMPATIBILITY.md. Game-menu automation is experimental and is not represented as approved by Supercell.

## Visual requirements

Black widget surface, white primary text and neutral gray secondary text. Basics are village identity, Town Hall, expected builders free, nearest completions, and source freshness/estimate labels. Stable-width timer digits, one-line truncation and responsive row counts keep small widgets readable. Larger widgets may show the next upgrade. Native iOS tinted rendering follows system semantic foregrounds.

Sources: [Android clipboard restrictions](https://developer.android.com/privacy-and-security/risks/secure-clipboard-handling), [Apple app automation triggers](https://support.apple.com/en-tm/guide/shortcuts/apde31e9638b/ios), [Android UI Automator](https://developer.android.com/training/testing/other-components/ui-automator).

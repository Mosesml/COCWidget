# Architecture

COCWidget is an Expo 58 / React Native application for iOS and Android. Web shares the same application and domain logic for development and interaction checks; it is not a substitute for a native widget.

| Layer | Responsibility |
| --- | --- |
| `src/core/import.ts` | Validate full village exports, preserve raw fields and decode counted/nested inventory. |
| `src/core/catalogue.ts` | Access the attributed, pinned game catalogue. |
| `src/core/strategy.ts` | Explain army priorities, schedule independent lanes, calculate equipment targets/ore. |
| `src/core/time.ts` | Integrate boost/helper boundaries and compare supported magic items. |
| `src/core/history.ts` | Compare observed distributions in common snapshot sections. |
| `src/core/workspace.ts` | Account isolation, backup validation and import replacement rules. |
| `src/core/widgets.ts` | Serialize small cross-platform widget projections and bounded/coalesced iOS timeline dates. |
| `src/app/useWorkspace.ts` | Load and serialize local writes through AsyncStorage. |
| `src/ui/` | Responsive screens, common visual primitives and import/recovery flows. |
| `src/widgets/*.ios.*` | Expo Widgets/SwiftUI layout, App Group publication and dynamic tag configuration. |
| `modules/coc-widget/` | Android Expo module, RemoteViews provider and per-widget configuration Activity. |

## Why the Android widget has a native adapter

The current Expo Widgets configuration API supports dynamic account selection on iOS. Android requires configuration per AppWidget ID, so its provider is a small local Kotlin module. Switching the active account never overwrites the per-widget preference. The common projection supplies names, estimated deadlines, next actions and source freshness to both implementations.

The iOS widget uses a pure isolated layout function. It cannot read the React app's hooks, state or AsyncStorage directly. The publisher updates the App Group and configuration options after accepted local state changes. Android writes SharedPreferences before refreshing installed widgets. App widget updates are best effort under operating-system limits.

## Local data and recovery

Up to 25 villages are stored independently, with up to 60 snapshots each. Persisted backups contain raw exports and account preferences rather than duplicating derived entities. Loading/restore rebuilds and validates snapshots against the current parser. Writes are serialized, size-bounded and saved before the UI accepts the new state. Unreadable data is preserved until explicit restore/reset; a validation failure never replaces it with demo data.

The two clearly labeled example villages are built from public anonymized fixtures and synthetic equipment selections/timestamps. No personal export or key is required to explore the app.

## Validation boundaries

Domain tests, type checking, browser interactions, native project generation, isolated widget serialization and native compilation are different checks. Record them separately in VALIDATION.md. OS delivery, signing and physical-device behavior cannot be inferred from a browser screenshot or a JavaScript bundle.

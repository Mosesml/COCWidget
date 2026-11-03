# Architecture

The product is a native Android widget with a small Expo/React Native setup utility and host-side automation scripts. iOS widget source is retained for the next platform phase. There is no website or browser target.

## Delivery path

`export source → sync runner → request ID → native receiver → validated serialized save → widget projection → native publication → acknowledgement`

`src/core/sync.ts` owns serialized imports, duplicate/older handling, fresh-export/account guards and acknowledgement ordering. Invalid data cannot replace stored snapshots. Publishing can fail after persistence; retrying the same export republishes without adding duplicate history. Active app village selection does not change on background import.

`src/app/useWorkspace.ts` serializes AsyncStorage writes. `App.tsx` is a compact native setup/import utility: automation enablement, last result, saved villages and backup/recovery. First launch starts empty. Existing local workspaces remain readable.

## Android transport

`scripts/sync-village.ts` validates a file and transfers it to the app-specific external imports directory using ADB. The launch URL contains only a bounded request ID. `CocWidgetModule.readIncomingExport` restricts filenames and size, reads the file and removes it. The app validates/saves and calls the widget bridge before logging a small result with that ID. No raw export/clipboard content is written to the acknowledgement log.

The runner starts listening before launching the receiver. It reports success only after acknowledgement. `scripts/lib/watch.ts` polls files/directories so atomic rename is supported; delivery failures remain eligible for retry.

The optional `export-android.ts` runner opens the installed Clash launcher, waits for load, verifies focused package and calibrated screenshot dimensions, then performs recorded menu actions. The device clock sets the minimum acceptable export timestamp. It opens the clipboard receiver after copying; Android clipboard reading occurs while the companion has focus. Profiles support taps, swipes and Back only. They contain no shell commands. Stop on mismatch or missing fresh JSON.

The development-only `cocwidget://test-export` source simulates Settings/Copy with a public fixture and a current timestamp. It is excluded from release behavior and makes export/clipboard/delivery regression tests possible without a Clash account. Its verification is explicitly synthetic.

## Widget layer

`src/core/widgets.ts` emits small projections, with saved source time distinct from generated forecast time. Android RemoteViews use native Chronometers, per-AppWidget-ID configuration and best-effort inexact boundary refresh. Separate portrait/landscape views bound visible row counts. iOS uses an isolated SwiftUI layout, App Group data and bounded/coalesced WidgetKit timelines.

The remaining `src/core/` modules retain parsing, catalogue, boost timing, strategy, equipment and history logic. Raw exports remain the source of truth. See DATA_MODEL.md for assumptions, THIRD_PARTY.md for catalogue/fixture notices, and VALIDATION.md for actual checked platform behavior.

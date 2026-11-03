# Widget, automation and compatibility audit

November 3, 2026. Reviewed the shared parser/storage/sync path, ADB file watcher and export runner, Android bridge/configuration/RemoteViews, iOS publication/layout/generated targets, dependency advisories and platform/distribution requirements. No live Clash account or physical iPhone was available. The website remains removed.

## Result

The Android standalone app accepts paired JSON delivery and publishes to an installed widget without Metro. The black/white widget was visually inspected on the API 34 emulator, including 200% text scaling. The native iOS app and widget compile on hosted macOS/Xcode, and 42 isolated iOS SDK rendering states pass. A standalone Scriptable iPhone widget now bundles the same parser/catalogue and accepts Shortcut input; its generated script passes simulated API tests. Physical iPhone installation, real-game export calibration and broad Android device support remain unverified.

## Fixed findings

| Severity | Finding | Change and evidence |
| --- | --- | --- |
| High | Android AsyncStorage stores could save a large workspace but fail to read it back (about 2 MB per value). | Move full workspace backups into immutable app-private file generations; commit only a small pointer after a successful write, migrate readable legacy data, and preserve the previous pointer on failure. A 2,923,996-byte workspace survived a real cold restart. |
| High | External apps/websites could submit automatic import links after a single global enable switch. | Added a 256-bit random private pairing code, checked before any clipboard/file read or write. Reset revokes previous scripts. Wrong/correct codes exercised against the installed standalone app. Manual user-initiated import remains available. |
| Medium | Generated Android manifests included unnecessary overlay and broad external-storage permissions. | Block SYSTEM_ALERT_WINDOW, READ_EXTERNAL_STORAGE and WRITE_EXTERNAL_STORAGE; app-private storage and system document selection remain available. |
| Medium | Shell-process errors could include a newly added pairing token in the failed launch command. | Redact the exact token from ADB diagnostics. Regression invokes a failing command and asserts that its error contains no token. |
| Medium | Unknown JSON could be deeply nested, broad, non-finite or exceed the intended UTF-8 limit. | Bound the entire tree to depth 32 / 50,000 values, enforce 1 MB UTF-8 bytes, reject invalid numbers and more than 64 timer entries. Bound traversal work before pushing a huge pending list. Original accepted fields remain intact. |
| Medium | Stat-then-read file races could bypass size checks. | Node reads through a bounded open handle and rejects invalid UTF-8. Android bounds stream reads, restricts names, rejects redirected paths and deletes consumed files. |
| Medium | A 32-bit fingerprint could falsely identify different snapshots as equal. | Sync and workspace duplicate checks compare canonical full JSON. Watch delivery uses SHA-256 of the input instead of a short snapshot hash. Same-time different-data conflicts remain explicit errors. |
| Medium | Oversized timer projections and repeated WidgetKit timeline payloads could exhaust widget storage. | Limit timer input, shorten projected identifiers and bound repeated timeline payload size to about 1 MB / at most 96 dates. Original raw exports remain in app storage. |
| Medium | Widget configuration accepted arbitrary widget IDs. | Verify AppWidgetManager ownership before rendering choices/writing settings; handle failed persistence. Real launcher configuration succeeds with a valid owned ID. |
| Medium | Missing/malformed delivery results and rapid persistent retries could mislead or repeatedly foreground the app. | Validate acknowledgement status/metadata consistency, consume log stderr, back off repeated failed deliveries up to 60 seconds and bound bookkeeping. The acknowledged operation is native publication, not proof that a launcher rendered it. |
| Medium | Backup restore could race imports or fail when the existing workspace was unreadable. | A serialized replacement operation bypasses the unavailable current workspace while retaining save-before-publish ordering. System-picker restoration recovered a deliberately corrupted synthetic workspace with five snapshots. Unknown saved-result values are filtered and initial-link failures are handled. |
| Medium | An import burst silently dropped queued requests. | Limit the inbox and explicitly report failure for requests rejected when full. |
| Medium | Unexpected counted builder huts could create invalid preferences and an unrestorable backup. | Cap forecast builder capacity at six, preserve original counts and add a warning. Backup round-trip regression covers this case. |
| Medium | Ctrl+C during a pause/focus check could leave a later menu tap pending. | Make waits abortable, check cancellation after focus inspection and stop the interval runner cleanly. Regression asserts no tap after cancellation. |
| Medium | iOS declared 16.4 while its configurable widget uses iOS 17 App Intent APIs. | Set 17.0 for app and extension; generated target settings inspected and native Xcode CI compilation succeeds. |
| Medium | The polished Android divider used an unsupported RemoteViews class. | Actual launcher testing found a full-widget inflation failure. Replace plain View with TextView and add an allowed-class regression. Reinstalled corrected standalone APK renders successfully. |
| Moderate advisories | glob and minimatch build-tool denial-of-service advisories affected the dependency tree. | Pin patched versions via npm overrides without downgrading Expo. Full shared/native exports and prebuilds pass; final npm audit reports zero advisories. |

Android AsyncStorage limitations are documented by [the library maintainers](https://react-native-async-storage.github.io/2.0/advanced/Limits/). The file-generation repository avoids the large SQLite value boundary.

The dependency fixes address [glob cancellation](https://github.com/advisories/GHSA-3g3m-2fjr-6pw4) and [minimatch amplification](https://github.com/advisories/GHSA-g3hv-75wg-m249). A clean scan covers known published advisories, not every possible vulnerability.

## Verification

- `npm run check`: TypeScript, generated Scriptable bundle, 41 domain/automation/platform/persistence tests and Android/iOS production JavaScript exports pass.
- `npm run check:widget-layout`: layout registration and 42 states rendered with Expo's actual isolated iOS SDK JavaScript runtime pass (three sizes, full color/accented, selected/overview/removed villages, before/after completion, empty state).
- Native Android debug and universal standalone release compilation pass. The APK manifest/native libraries declare API 24 minimum and all four ABIs. Real paired CLI import, native publication and launcher rendering exercised with the standalone app and Metro stopped.
- Native iOS app/extension compilation passes in [the hosted Xcode job](https://github.com/Mosesml/COCWidget/actions/runs/41590410789/job/125765593709), commit `4eabfa0`. It is an unsigned simulator build, not an installable physical-phone IPA.
- Scriptable's generated distributable executes in a simulated documented API: saves complete supplied JSON, rejects malformed data, preserves newer data, selects independent villages and never reads the clipboard during widget/Shortcut execution. Physical Scriptable storage/refresh/rendering is not verified.
- Native CI testing found obsolete SDK setup defaults and then the SDK 37 package's exact repository name (`platforms;android-37.0`). Explicit packages replace the defaults; local installed SDK metadata confirms that package name. Follow the native workflow for hosted Android compilation results.

See [VALIDATION.md](VALIDATION.md) for screenshots and earlier synthetic menu-runner tests. None establish a working live Clash menu profile.

## Full interface review

Mode: full. Scope: Android RemoteViews widget/preview/configuration, iOS SwiftUI widget and Scriptable widget; existing native XML/Kotlin, Expo UI and Scriptable styles. Native setup utility received neutral colors only. Browser motion/hover checks do not apply because there is no website, and widgets have no custom animations.

| Category | Evidence inspected | Result |
| --- | --- | --- |
| Typography | Android widget layouts/native timer and 200% text screenshot; iOS small/medium/large runtime trees; Scriptable source and generated execution | Monochrome hierarchy, stable timer digits, line limits and reduced rows implemented. iPhone visual sizing remains unverified. |
| Surfaces | Android background/padding/divider/preview and actual launcher screenshots; iOS container styling; Scriptable container | Black surfaces with white/neutral-gray text. Android host rendering verified after divider fix. Other launchers and minimum-height sizing unverified. |
| Animations | Native Chronometer and SwiftUI interval text; absence of custom effects | No decorative animation; native timer updates only. Android expiry in Doze remains an OS scheduling limitation. |
| Icons | Removed decorative iOS diamond; native widget root/picker | No extra icon clutter in widget content. Launcher icon is unchanged. |
| Performance | Visible-row calculations, font-scale handling, bounded timer/tree inputs, timeline limits | Bounded projections and visible rows. Medium iPhone overview omits extra detail lines to preserve vertical space; actual iPhone layout still requires inspection. |

| Severity | Location | Before | After | Why |
| --- | --- | --- | --- | --- |
| Medium | Android/iOS/Scriptable widget surfaces | Green/lime palette and decorative accent | Black, white and neutral gray; iOS tinted mode uses semantic styles | Consistent hierarchy and contrast. |
| Medium | Android timer rows and iOS small widget | Small timers competed with metadata | Larger timer digits and quieter metadata | Typography makes the nearest completion easier to scan. |
| Medium | Android narrow/large-text rows | Fixed density could clip | Stack timers, reduce rows and hide secondary fields when needed | Responsive density protects primary information. At 200% the footer can truncate; screen-reader description retains the estimate/source context. |
| Medium | iOS/Scriptable medium overview | Repeated timer/date/detail lines could overflow | Compact overview rows; inline Scriptable finish times | Text wrapping and space budgeting; physical visual verification remains open. |
| High, fixed | Android divider | Plain View invalidated the entire RemoteViews layout | Supported TextView divider | Framework support is a prerequisite for any visual polish. |
| Low | iOS header | Decorative diamond took space | Simple village heading | Icon restraint keeps attention on basic data. |

Considered but rejected: custom animated progress rings (extra distraction and host/runtime complexity); aggressive font shrinking to force every field into a small widget (readability); Scriptable timer-style dates (they count upward after expiry, so absolute finish times stay truthful). Native Android exact-alarm/foreground-service machinery was not added solely to force per-second completion transitions.

Interface verdict: **Needs changes before broad release**, with physical iPhone visual inspection, minimum-size/rotation/OEM launchers, full screen-reader navigation and long-running idle behavior still unverified. The tested Android normal/200% states render; no known full-widget rendering failure remains in that checked setup.

## Remaining product boundaries

- **Fresh game data:** only user-exported JSON or the experimental calibrated Android menu driver. A file watcher or app-close Shortcut does not make Clash produce an export.
- **Game-menu automation:** the exact live client path is not verified. Foreground/dimension checks do not identify every in-game overlay. Supercell's automation terms have not been cleared for this exporter; see [compatibility notes](COMPATIBILITY.md).
- **Every Android:** no such support claim. Declared minimum is API 24, runtime evidence is API 34/Pixel Launcher, and CPU architecture depends on the built artifact. OEM battery restrictions and inexact alarms can delay boundary changes; an Android countdown may become negative while waiting for refresh.
- **iPhone:** native compilation now passes; physical signing/App Groups, Shortcut delivery and Home Screen behavior need testing. Scriptable avoids compiling our app but has separate storage and iOS-controlled refresh. Background App Intent/share import is an investigated future implementation, not shipped functionality.
- **Privacy:** exports stay in app/local Scriptable storage and no server is contacted by the sync/widget logic. Local device backups and other scripts installed within Scriptable have their own trust boundary. Custom URL schemes can be claimed by another app; native iOS transport is not a verified universal link. Android 7–9 external import storage has weaker isolation.
- **Distribution:** preview builds use development signing; production signing, store packaging and public setup testing remain open. No paid account or external service has been configured.

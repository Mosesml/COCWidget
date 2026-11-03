# COCWidget goals

Current priority from Moses: **widget + working automatic refresh, Android first; no website**. Work on main, commit frequently, push only to Mosesml/COCWidget.

## Current Android milestone

- [x] Remove web target, server, dashboard screens, website assets and browser tooling.
- [x] Keep a small native widget/import setup utility.
- [x] Serialize validate → persist → publish → acknowledge.
- [x] Automatic import mode without a per-import Save prompt.
- [x] Idempotent retries, older-snapshot rejection and independent village identity.
- [x] Bounded file transfer instead of oversized ADB command URLs.
- [x] File/directory watcher, partial writes, atomic replacement and acknowledgement retries.
- [x] Device-specific export profile calibration and connected Android menu runner.
- [x] Foreground/screen checks, fresh-export guard and optional expected player tag.
- [x] Type checking and 25 domain/automation tests.
- [x] Android and iOS JavaScript bundle exports after removing the website.
- [x] Compile the updated native bridge, Android debug app and standalone APK.
- [x] Verify script acknowledgement and automatic widget refresh on the emulator, including waking a stopped companion.
- [x] Verify the calibration wizard and export-menu runner end to end using the development-only synthetic source.
- [ ] Verify calibration and repeated export against a real installed Clash client.
- [x] Record final checks and push clean checkpoints.

## iOS phase (retained in PRD)

- [x] Shared receiver logic, SwiftUI layout and App Group publisher source.
- [x] Native app/extension compilation on GitHub macOS/Xcode CI (unsigned simulator build).
- [ ] Actual iPhone Shortcut import/update and per-widget account tests.
- [x] Investigate App Intent/share delivery, Scriptable and developer-rig iPhone automation; document implementation requirements.
- [x] Build a standalone Scriptable widget with shared parser/catalogue and Shortcut JSON input.
- [x] Exercise the generated Scriptable artifact against a simulated API and 42 native iOS SDK runtime layout states.
- [ ] Physical iPhone test for Scriptable imports, local storage, selected villages and refresh.
- [x] Document copied game JSON as the current iOS source; app-close automation alone is not an export.

## Foundation retained

- [x] Complete raw exports, counted walls, nested module timers and unknown fields.
- [x] Pinned, attributed catalogue with cost/duration normalization.
- [x] Multiple accounts, snapshot history, backup/restore validation.
- [x] Army priorities, prerequisite scheduling, ore arithmetic and progress comparison in the domain layer.
- [x] Prior Android widget test observed countdowns, source dates, account isolation and an expected-completion boundary.

## Release work

- [x] Audit import authorization; require revocable private automation pairing codes.
- [x] Bound unknown JSON depth/size, native file reads, timer payloads and repeated widget timelines.
- [x] Validate widget ownership and delivery acknowledgements; serialize backup restoration.
- [x] Patch the two vulnerable build-tool dependencies; npm installation reports zero advisories.
- [x] Monochrome native widget layouts; launcher rendering and 200% text checks on API 34.
- [x] Fix the unsupported RemoteViews divider found by actual host testing and add a framework restriction regression.
- [x] Document iPhone setup, alternatives and the Android version/ABI/launcher support boundary.
- [x] Native iOS app and widget compile on hosted macOS/Xcode; physical iPhone checks remain open.

- [ ] Current live-game catalogue, special-operation and boost audit.
- [ ] Alternate launchers, resize/rotation, larger text, DST, Doze and long-running device checks.
- [ ] Phone-only export automation feasibility; the current Android menu runner uses an unlocked ADB-connected device and a host.
- [ ] Signing, distribution and public user setup testing.

## Checkpoints

- Initial foundation: six commits established parser, catalogue, widgets and native/browser prototype. Moses reprioritized the widget and script; website scope was removed.
- Automatic delivery: 25 tests pass, including save-before-ack, missing-ack retry, stale/wrong-village guards and atomic-file watching. Native receiver, ADB file delivery and calibrated menu runner are implemented; updated device verification is in progress.

- Android device checkpoint: file delivery and the atomic-file watcher update an installed widget without a Save prompt, after one-time enablement. The calibrated synthetic export sequence produces fresh clipboard JSON and receives a native widget acknowledgement. The Android 14 focus query was corrected from actual device output. Debug and standalone APK compilation pass. Live Clash calibration remains open.

- Final Android check: the repeated synthetic export loop completed two unattended 60-second cycles. The standalone APK then accepted a 307,618-byte export with Metro stopped and the companion initially force-stopped; an installed widget showed the updated timer. No website is required. Live Clash device calibration and iOS device work remain open.

- Audit checkpoint: private pairing gate tested in the standalone Android app, 35 automated tests pass, 42 isolated iOS SDK layout states pass, and native iOS compilation succeeds at `4eabfa0`. Android CI setup was found to request obsolete SDK `tools`; explicit SDK packages replace that default. Scriptable uses the same parser and preserves one full latest export per village; its physical iPhone integration is unverified.

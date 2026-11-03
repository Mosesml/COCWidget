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
- [ ] Full Xcode app/extension compilation.
- [ ] Actual iPhone Shortcut import/update and per-widget account tests.
- [ ] Background-capable App Intent/share delivery investigation.
- [ ] Document the fresh-export source available on iOS; app-close automation alone is not an export.

## Foundation retained

- [x] Complete raw exports, counted walls, nested module timers and unknown fields.
- [x] Pinned, attributed catalogue with cost/duration normalization.
- [x] Multiple accounts, snapshot history, backup/restore validation.
- [x] Army priorities, prerequisite scheduling, ore arithmetic and progress comparison in the domain layer.
- [x] Prior Android widget test observed countdowns, source dates, account isolation and an expected-completion boundary.

## Release work

- [ ] Current live-game catalogue, special-operation and boost audit.
- [ ] Alternate launchers, resize/rotation, larger text, DST, Doze and long-running device checks.
- [ ] Phone-only export automation feasibility; the current Android menu runner uses an unlocked ADB-connected device and a host.
- [ ] Signing, distribution and public user setup testing.

## Checkpoints

- Initial foundation: six commits established parser, catalogue, widgets and native/browser prototype. Moses reprioritized the widget and script; website scope was removed.
- Automatic delivery: 25 tests pass, including save-before-ack, missing-ack retry, stale/wrong-village guards and atomic-file watching. Native receiver, ADB file delivery and calibrated menu runner are implemented; updated device verification is in progress.

- Android device checkpoint: file delivery and the atomic-file watcher update an installed widget without a Save prompt, after one-time enablement. The calibrated synthetic export sequence produces fresh clipboard JSON and receives a native widget acknowledgement. The Android 14 focus query was corrected from actual device output. Debug and standalone APK compilation pass. Live Clash calibration remains open.

- Final Android check: the repeated synthetic export loop completed two unattended 60-second cycles. The standalone APK then accepted a 307,618-byte export with Metro stopped and the companion initially force-stopped; an installed widget showed the updated timer. No website is required. Live Clash device calibration and iOS device work remain open.

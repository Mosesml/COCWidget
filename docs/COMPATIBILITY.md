# Platform compatibility

Audit date: November 3, 2026. Build compatibility, emulator verification and physical-device support are separate claims.

## Will it work on every Android?

**No.** The current app declares **Android 7.0 / API 24 or later**. Its standard build configuration includes `armeabi-v7a`, `arm64-v8a`, `x86` and `x86_64`. The audit now builds a **universal preview APK with all four ABIs**, confirmed from the packaged native libraries. Earlier preview APKs were ARM64 only. Compilation of an ABI does not establish device behavior; runtime tests still cover ARM64/API 34 only. Produce a properly signed Android App Bundle for public distribution.

A Home Screen launcher must support Android app widgets. Device grid, launcher padding and widget size vary; widgets are not supported on every launcher, Android TV, Android Auto or Wear OS by this phone/tablet implementation. The companion's build minimum is separate from the requirements of the installed Clash client.

| Setup | Current evidence |
| --- | --- |
| Pixel 3a ARM64 emulator, Android 14 / API 34, Pixel Launcher | Standalone app, paired file delivery, native widget rendering and earlier synthetic export-menu/clipboard automation exercised. |
| Android 7–13, 15–17 | Within declared version range; no runtime tests in this audit. |
| Physical Samsung / Xiaomi / OnePlus / other OEMs | Not tested. Launcher layout and battery management may differ. |
| ARMv7 / x86 / x86_64 | Universal APK compilation passes and packaging includes all four ABIs. Runtime behavior on those three architectures is unverified. |
| Small/narrow widgets and large text | Responsive row limits and stacked timers implemented; actual checked states are recorded in VALIDATION.md. |
| Locked device / disconnected host | Existing widget can show saved data. The menu-export script cannot run reliably in this state. |
| No computer / host | Manual imports work. Current ADB export-menu automation requires a running host. |

## Android refresh and privacy limits

Full workspace history now lives in app-private file generations with a small committed pointer; a 2.9 MB workspace survived a cold restart on the emulator. This avoids Android AsyncStorage's approximately 2 MB per-value read limit.

Native countdown text runs in the launcher. Boundary refresh uses an inexact alarm and ordinary widget updates; Android can defer it in Doze or for battery reasons. Completion rows/free-builder counts may change late. A native Chronometer may briefly show a negative countdown after its deadline if the boundary update is deferred; the absolute finish date remains visible where space permits. We do not request exact-alarm permission or keep a foreground service running to guarantee instant completion transitions. Device clock changes can affect elapsed-realtime countdowns until the next update.

JSON file delivery temporarily uses the app-specific external imports folder and deletes transferred files after reading/cleanup. Android 10+ applies scoped-storage protections. Older Android releases offer weaker isolation for external storage, so manual clipboard import is preferable if that matters for a sensitive export. Raw exports/clipboard text are not written to sync-result logs. ADB itself is a trusted developer connection; disconnect unauthorized hosts and keep the pairing code private.

The ADB runner requires Node 22, Android platform-tools, a device authorized for USB/wireless debugging, an unlocked source screen, matching calibration and the host process running. Root is not required. The audit's rooted emulator was used only to provision synthetic test settings; user setup copies the code in the app. Screen dimensions, game language, UI scale, account switches and game updates may require a new profile. Foreground/dimension/freshness checks reduce mistakes but do not recognize every in-game overlay or prove that each coordinate hits Copy.

For a phone-only future route, Android's AccessibilityService can dispatch gestures after explicit permission; Shizuku can expose shell-level operations, with wireless startup on Android 11+. Both add setup, permissions, OEM/reboot limitations and a separate distribution/policy burden. Neither is implemented. They do not remove the need for an unlocked, calibrated game UI.

## iPhone / iPad

The native app/widget now declare iOS/iPadOS **17+** because configurable WidgetKit uses App Intents. Physical installation needs Xcode/provisioning/App Groups or an appropriately signed distributed build. JavaScript export and runtime-layout checks alone do not establish native installation.

The optional Scriptable integration avoids compiling/signing our own app. Install the Scriptable app, add the bundled script and pass copied export JSON from Shortcuts. It has independent local storage and iOS-managed widget refresh. Physical-device verification remains required. See [iPhone setup and investigated alternatives](IOS_SETUP.md).

## Game automation release boundary

Supercell's [Terms of Service](https://supercell.com/en/terms-of-service/) broadly restrict automation software and unauthorized software that modifies or interferes with the game/service. Their [Safe and Fair policy](https://supercell.com/en/safe-and-fair-play/) addresses gameplay automation. This audit has not established permission for a menu-tapping exporter. The calibrated runner remains experimental; it must not be marketed as approved, risk-free or proven on a live account. Importing user-supplied exports does not require the menu runner.

Sources: [Android app widget overview](https://developer.android.com/develop/ui/views/appwidgets/overview), [RemoteViews restrictions](https://developer.android.com/reference/android/widget/RemoteViews), [Android inexact alarms](https://developer.android.com/develop/background-work/services/alarms), [Android clipboard restrictions](https://developer.android.com/privacy-and-security/risks/secure-clipboard-handling), [Accessibility gestures](https://developer.android.com/reference/android/accessibilityservice/AccessibilityService), [Shizuku setup](https://shizuku.rikka.app/guide/setup/). Exact app minimum/ABIs were inspected in the installed React Native Gradle version catalogue and generated Gradle configuration.

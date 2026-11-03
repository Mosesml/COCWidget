# Automatic widget refresh

Android first. This product has three distinct stages: producing a fresh game export, delivering JSON, and publishing widget data. A watcher alone only handles delivery.

## Android setup

1. Install the native COCWidget app (`npm run android` for a development build).
2. Open it once and enable **Automatic imports**. This allows valid sync requests to save and refresh without a Save prompt.
3. Enable Android USB debugging, connect the device and find its serial with `adb devices`. Node 22 and Android platform-tools must be available on the host; `--adb /absolute/path/to/adb` overrides the binary.
4. Import once, then add COCWidget from your launcher's widget picker. Each installed widget selects its own village or overview.

## Deliver one file

```sh
npm run sync -- --device SERIAL --file village.json
```

The runner fully validates JSON before sending. It uses an app-specific file rather than embedding the full export in a shell URL. A unique request ID is sent to the app; the native module reads and deletes the transfer file. The app saves first, publishes the widget projection second, then acknowledges the request. Success means the native widget bridge accepted the update; the host does not infer success from `am start`.

The app returns to the background after a successful automated import. Invalid data, disabled automation, an unavailable widget bridge or a timeout produce an error. Retry the same file safely: duplicates republish current state without duplicating history. Older snapshots leave newer data intact and report `ignored_older`.

## Watch exports

```sh
npm run sync -- --device SERIAL --watch /path/to/village.json
npm run sync -- --device SERIAL --watch /path/to/export-folder
```

The watcher polls once a second, supports atomic file replacement and ignores files until their JSON validates. Only acknowledged snapshots are skipped on later scans. Missing acknowledgement or failed publication remains eligible for retry. Stop with Ctrl+C. It watches the chosen local source; it does not upload to a server or ask Clash to generate data.

## Generate fresh JSON through Android's export menu

```sh
npm run export:android -- --device SERIAL --calibrate /private/path/device.json
```

The calibration wizard opens Clash and saves a current screenshot beside the profile. Open that image to locate menu controls. Enter `tap x y`, `swipe x y endX endY`, or `back` to perform and record an action. Follow Settings → More Settings → Data Export → Copy, including any scroll required to reach Copy. Record the steps to close those menus back to the village so the next cycle begins in the same state. Enter `done`, then optionally enter the expected player tag. Keep the profile private/local; it is not committed to the repo.

Test one export:

```sh
npm run export:android -- --device SERIAL --profile /private/path/device.json
```

Then run repeatedly, for example every 15 minutes:

```sh
npm run export:android -- --device SERIAL --profile /private/path/device.json --interval 900
```

The script requires the host to keep running and the connected Android device to stay unlocked. It briefly takes over the screen each cycle. It verifies foreground package before each tap and calibrated dimensions before the sequence. It then opens COCWidget in the foreground to read the clipboard; Android blocks ordinary background clipboard readers. A minimum export timestamp from the device clock and optional expected tag prevent an unchanged/wrong clipboard value being reported as a new successful export. A failure stops the menu runner. Recalibrate after screen/layout changes.

**Verification boundary:** the production code uses the installed `com.supercell.clashofclans` client. Its exact menu sequence must be calibrated/tested on the user's game version. The development-only `--test-source` flag targets a labeled synthetic export source in a debug COCWidget build. Synthetic tests establish the runner/clipboard/receiver/widget chain; they do not establish a live Clash profile or reliable operation while the device is locked.

## iOS next phase

The Android ADB transport does not deliver directly to an iPhone. The retained iOS receiver/widget code needs native compilation and device tests.

Planned Shortcut: **Get Clipboard → URL Encode → Open URLs**, using `cocwidget://sync?data=` followed by encoded text. With Automatic imports enabled, a valid request saves and publishes without an app Save prompt. An App/Is Closed personal automation can trigger that handoff when leaving Clash. It still needs a fresh export in the clipboard; that event does not make the game export JSON. An App Intent/share extension is tracked separately in the PRD.

Sources: [Android clipboard restrictions](https://developer.android.com/privacy-and-security/risks/secure-clipboard-handling), [Apple app trigger behavior](https://support.apple.com/en-tm/guide/shortcuts/apde31e9638b/ios), [Apple automatic shortcut triggers](https://support.apple.com/en-euro/guide/shortcuts/apdfbdbd7123/10.0/ios/27).

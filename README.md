# COCWidget

**Android home-screen widgets and automatic village JSON delivery.** No website. The small native companion configures imports, stores villages and publishes widget data.

Android is the first delivery target. iOS widget source is retained; its device integration is the next phase in [the PRD](docs/PRD.md).

## Run the Android app

Use Node 22 LTS, an Android SDK/JDK and a connected emulator/device:

```sh
nvm use
npm ci
npm run android
```

Open COCWidget once and enable **Automatic imports**. Add its home-screen widget through your launcher and choose a village after the first import. Each widget keeps its own selection.

## Send or watch existing exports

Enable USB debugging and find your device with `adb devices`:

```sh
npm run sync -- --device SERIAL --file village.json
npm run sync -- --device SERIAL --watch /path/to/export-folder
```

The runner validates the full JSON, transfers it to app-specific device storage, and waits for the native app to save and refresh the widget. It prints success only after the widget bridge acknowledges publication. No Save prompt is required after the one-time automation setting. Failed delivery is retried by the watcher; duplicates do not add history, and older snapshots never replace newer data.

The watcher consumes files produced elsewhere. It does not generate game exports.

## Automate the Android game export menu

```sh
npm run export:android -- --device SERIAL --calibrate /private/path/device.json
npm run export:android -- --device SERIAL --profile /private/path/device.json
npm run export:android -- --device SERIAL --profile /private/path/device.json --interval 900
```

Calibration records Settings → More Settings → Data Export → Copy and the taps that close those menus again. A screenshot is saved beside the profile after each recorded step. The runner checks foreground package, calibrated screen dimensions, new-export timestamp and optional expected player tag before acknowledging a refresh.

This route requires the host script, USB debugging, an unlocked connected Android device and calibration for that device/game layout. It briefly occupies the device each cycle. It is not silent background export from an ordinary locked phone. Stop with Ctrl+C. A failed export stops the menu runner rather than repeating uncertain taps. See [the automation guide](docs/IMPORT_AUTOMATION.md) for setup and current verification boundaries.

## Checks and progress

```sh
npm run check                 # TypeScript, domain/automation tests, native JS bundles
npm run check:widget-layout   # isolated iOS layout registry (after iOS prebuild)
```

- [PRD and platform roadmap](docs/PRD.md)
- [Goals/checkpoints](docs/GOALS.md)
- [Validation record](docs/VALIDATION.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Data model and assumptions](docs/DATA_MODEL.md)
- [Third-party notices](THIRD_PARTY.md)

Exports stay local. The pinned catalogue contains 1,140 normalized entities; complete raw/unknown fields are preserved. Countdown completion is a prediction until another export confirms it. Catalogue/boost audits, iOS device testing, additional Android launchers and signed public distribution remain release work.

This is an unofficial fan project, not affiliated with or endorsed by Supercell.

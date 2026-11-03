# iPhone and iPad setup

There are two paths: the native COCWidget app and an optional Scriptable widget. Neither retrieves a fresh export from Clash silently. Copying the game's data export remains the source step. The integrations do not use a private game API, game files, login credentials or a backend.

## Try the Scriptable path without compiling an app

Status: implemented, bundled and exercised against a simulated Scriptable API in Node. **Not yet tested on a physical iPhone.** Installability, actual Shortcuts execution, storage sharing and widget rendering/refresh need that test.

1. Install [Scriptable](https://scriptable.app/) on the iPhone. Save [COCWidget.js](../integrations/scriptable/COCWidget.js) as a script named **COCWidget**. Use the GitHub file's Raw/Download action, not its rendered page; the file includes the parser and catalogue, so no extra scripts are required.
2. In Clash, use Settings → More Settings → Data Export → Copy (menu names/availability may differ by client version).
3. Run COCWidget inside Scriptable and choose **Import copied JSON**. This action explicitly reads the clipboard. The script stores a complete latest export and a small widget cache locally; it makes no network requests.
4. Add a Scriptable Home Screen widget and edit it: select **COCWidget**, set **When Interacting** to Run Script, and choose a small, medium or large size. Set **Parameter** to a player tag such as `#ABC123`, or `all`. Blank means all. Import each village separately for multiple accounts.
5. Tap the widget to open the script's import/preview menu. Each widget keeps its parameter independently. Its data is separate from the native COCWidget app and is not synced through our app or a server.

### Shortcut handoff

Create a Shortcut with **Get Clipboard → Scriptable: Run Script (COCWidget)**. Pass the clipboard result into the Run Script action's **Parameter** field. Text or a parsed JSON dictionary is accepted. Run it once and grant the requested permissions.

A successful result reports `saved: true`, village tag, export timestamp and whether the import updated, matched or ignored older data. This confirms local files were saved. **It does not confirm the Home Screen was redrawn.** Scriptable exposes an earliest refresh date, and iOS decides the actual refresh time. Our script renders from saved projections when the widget next runs. It uses absolute completion times because Scriptable's timer-style date can count upward after expiry; the native widget has bounded countdown intervals.

You can attach the Shortcut to an **App / Is Closed** automation for Clash, with automatic execution enabled where supported. It hands off the clipboard after you switch away. It still requires fresh copied JSON. Avoid overlapping runs of the same import Shortcut; this prototype does not provide a cross-process transaction lock. The widget never reads the clipboard, and a Shortcut run reads only its explicit input. Deleting Scriptable deletes its local village data; retain original export files as backups. This alternative keeps one latest snapshot per village, up to 25, and does not import native-app history/preferences.

Build the downloadable script after changing its source:

```sh
npm run build:scriptable
```

## Native COCWidget app

Minimum declared deployment target: **iOS/iPadOS 17.0**. Configurable widgets use `AppIntentConfiguration`; declaring 16.4 was inconsistent and has been corrected for the app and extension.

A full Xcode installation is needed for a local native build. This workspace currently has Command Line Tools only. The repository's **Native compilation** workflow successfully compiled the app and widget on a GitHub macOS runner at commit `4eabfa0`: [verified iOS job](https://github.com/Mosesml/COCWidget/actions/runs/41590410789/job/125765593709). It produces an unsigned simulator app. A simulator build is not an installable iPhone IPA and does not establish signing, provisioning, App Group access on a phone or successful Home Screen behavior.

```sh
npm ci
npx expo prebuild --platform ios
npm run ios
```

For a physical phone, select your development team in Xcode, provision both the app `com.mosesml.cocwidget` and extension `com.mosesml.cocwidget.ExpoWidgetsTarget`, and register/enable `group.com.mosesml.cocwidget` for both. Use unique identifiers if those are unavailable to your team. Verify your account's App Groups capability; ordinary free-team sideloading should not be promised to work with this configuration. Public TestFlight/App Store distribution requires Apple Developer Program membership and signing. No Apple account, paid build service or provisioning credentials have been configured by this work.

In the installed native app, enable **Automatic imports**, copy the private pairing code, and build a Shortcut:

1. Get Clipboard.
2. URL Encode the complete clipboard text.
3. Open URL: `cocwidget://sync?token=YOUR_PRIVATE_CODE&data=ENCODED_TEXT`.

This opens COCWidget, validates the export, saves it and requests widget publication. It is a foreground handoff. Large exports should use the native JSON file picker until a file/share or App Intent transport exists; iOS URL transport limits have not been established. Keep the pairing code private and reset it in the app to revoke old Shortcuts. Custom URL schemes are not a verified transport identity: another installed app could register the same scheme. Do not add sync links containing private data to public pages or logs.

## Other possibilities investigated

| Route | What it could automate | Requirements / current result |
| --- | --- | --- |
| Native App Intent | Import JSON passed by Shortcuts, potentially in the background | Apple supports background intents. We would need shared durable storage between the intent/app/widget, one common parser/projection implementation, transaction handling and device tests. Not implemented; existing widget configuration intents do not import data. |
| Share extension | Import an explicitly shared JSON file/text | A separate extension target and App Group storage are needed. Does not make Clash export/share automatically. Not implemented. |
| App-close automation | Run the copied-JSON handoff | Official Shortcuts trigger; cannot generate new export data or navigate another app's menus by itself. |
| Mac + Appium/XCTest/WebDriverAgent | Potentially reproduce coordinate-based game-menu automation on a connected iPhone | Real-device developer provisioning, Xcode, a test runner, unlocked device and calibration. A developer-rig possibility, not a shipped phone-only solution; no live Clash/iPhone sequence tested. |
| Background task, Live Activity or widget reload | Update estimates from already-saved data | Does not grant access to another app or an always-running clipboard watcher. WidgetKit chooses scheduling; live text timers are a separate display feature. |
| Official future game export intent/API | Could remove manual copying if Supercell exposes it | No supported fresh private-village export endpoint or Shortcut intent has been established in this audit. Do not market this as available. |

Apple's widget refresh budget is typically 40–70 reloads per day for frequently viewed widgets, with system-managed timing. Native timer text can update independently; it does not fetch game state. Planned timeline entries are coalesced and total repeated payload size is bounded.

Sources: [Scriptable Shortcut parameters](https://docs.scriptable.app/args/), [Scriptable local files](https://docs.scriptable.app/filemanager/), [Scriptable widget refresh rules](https://docs.scriptable.app/listwidget/), [Scriptable date styles](https://docs.scriptable.app/widgetdate/), [Apple App triggers](https://support.apple.com/en-euro/guide/shortcuts/apde31e9638b/9.0/ios/26), [Apple widget refresh](https://developer.apple.com/documentation/widgetkit/keeping-a-widget-up-to-date), [Apple App Intent runtime modes](https://developer.apple.com/documentation/appintents/configuring-the-runtime-behavior-of-your-app-intents), [Apple App Groups](https://developer.apple.com/documentation/xcode/configuring-app-groups), [Apple developer accounts](https://developer.apple.com/help/account/basics/about-your-developer-account), [Appium real-device requirements](https://appium.github.io/appium-xcuitest-driver/6.2/preparation/real-device-config/).

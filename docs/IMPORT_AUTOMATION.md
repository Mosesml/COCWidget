# Getting village JSON into the widget

The game must produce a fresh export. Once the export is accepted, COCWidget stores it and publishes updated widget projections automatically. It does not continuously observe the game.

## iPhone: Shortcut handoff

Install a native COCWidget build first; Expo Go and the browser preview do not register the final application scheme or install widgets.

Create a Shortcut with these actions:

1. **Get Clipboard**.
2. **URL Encode** the clipboard text (Encode, not Decode).
3. **Text**: `cocwidget://import?data=` followed by the encoded text variable.
4. **Open URLs** with that Text output.

In Clash of Clans, use Settings → More Settings → Data Export → Copy. Run the Shortcut from its home-screen icon, an Action button assignment, or Shortcuts. A valid link opens directly at the village review; it does not save without confirmation. Confirm Save village & update widgets to update the local inventory and widgets.

You can also experiment with a personal automation when Clash of Clans closes, after explicitly copying the export. That event does not make the game create new JSON, so it can hand off an old clipboard value; the importer rejects old or duplicate snapshots. Actual Shortcut prompts and foreground behavior need physical-device testing.

No import URL is sent to a backend. A URL contains the village snapshot itself, so use a JSON file if the platform refuses a long URL. Keep clipboard/file import available as the reliable alternative.

## Android

Open COCWidget and use Paste from clipboard or Choose JSON file. Confirm the preview. Native widget projections are saved and every installed COCWidget widget refreshes; each widget retains its own selected village or overview mode.

Android restricts clipboard access to the focused app/default keyboard, so a background clipboard watcher is not a dependable import strategy. A future share extension can provide another explicit handoff; it is separate from game synchronization.

## Script helper

Generate an import URL from an exported JSON file:

```sh
node scripts/import-link.mjs village.json > import-url.txt
```

Or use stdin, including an explicit macOS clipboard read:

```sh
pbpaste | node scripts/import-link.mjs > import-url.txt
```

The helper validates the basic export shape and prints only the local application URL. It does not upload, watch the clipboard, access the game, or start an upgrade. Transfer/open the URL on a device with the native app installed. Do not assume a desktop URL opens an iPhone automatically.

## Platform widget behavior

iOS uses an App Group, dynamic village configuration and WidgetKit timelines. The shared payload contains every saved village; each widget selects its own tag. Scheduled entries handle predicted completion boundaries, while system Text timers animate countdowns.

Android uses a local Expo module with RemoteViews. Its configuration Activity stores the selected tag per AppWidget ID. SharedPreferences are written before refresh. Native Chronometers count down without a running React app; OS periodic updates and an inexact boundary alarm refresh rows. Android may delay alarms/updates under Doze or battery restrictions.

Switching the active village in the app never changes the configured tag of a widget. Removing a selected village produces an explicit removed-village state rather than silently showing a different account.

Sources: [Android clipboard restrictions](https://developer.android.com/about/versions/10/privacy/changes), [Apple paste controls](https://developer.apple.com/documentation/uikit/uipastecontrol), [WidgetKit update scheduling](https://developer.apple.com/documentation/widgetkit/keeping-a-widget-up-to-date), [Android widget configuration](https://developer.android.com/develop/ui/views/appwidgets/configuration).

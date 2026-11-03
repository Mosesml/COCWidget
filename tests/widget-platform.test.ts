import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';

test('Android widget layouts only use classes supported by RemoteViews hosts', () => {
  // A plain View compiles, but Android rejects the entire widget at inflation time.
  // https://developer.android.com/reference/android/widget/RemoteViews
  const allowed = new Set(['FrameLayout', 'LinearLayout', 'RelativeLayout', 'GridLayout', 'TextView', 'ImageView',
    'Button', 'ImageButton', 'Chronometer', 'TextClock', 'ProgressBar', 'ViewFlipper', 'ListView', 'GridView', 'StackView', 'AdapterViewFlipper']);
  const directory = new URL('../modules/coc-widget/android/src/main/res/layout/', import.meta.url);
  for (const file of readdirSync(directory).filter(name => name.endsWith('.xml'))) {
    const xml = readFileSync(new URL(file, directory), 'utf8');
    for (const match of xml.matchAll(/<([A-Za-z][\w.]*)\b/g)) assert.ok(allowed.has(match[1]!), `${file}: ${match[1]} cannot be inflated by a RemoteViews host`);
  }
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateProfile } from '../scripts/lib/export-profile';
import { AndroidExporter, isSourceFocused } from '../scripts/lib/game-export';
import { AndroidDevice, wait } from '../scripts/lib/android';

const profile = { version: 1, width: 2400, height: 1080, launchWaitMs: 15000,
  playerTag: '#abc123', actions: [{ kind: 'tap', x: 2000, y: 800, pauseMs: 1000 }] };
test('calibrated export profiles normalize the expected account and bound menu actions', () => {
  assert.equal(validateProfile(profile).playerTag, '#ABC123');
  assert.throws(() => validateProfile({ ...profile, actions: [{ kind: 'tap', x: 2500, y: 800, pauseMs: 1000 }] }), /outside/);
  assert.throws(() => validateProfile({ ...profile, actions: [{ kind: 'swipe', x: 100, y: 100, endX: 200, endY: 3000, durationMs: 500, pauseMs: 1000 }] }), /swipe/);
  assert.throws(() => validateProfile({ ...profile, actions: [{ kind: 'shell', command: 'anything' }] }), /action/);
  assert.throws(() => validateProfile({ ...profile, launchWaitMs: 0 }), /launch wait/);
  assert.throws(() => validateProfile({ ...profile, playerTag: '../../file' }), /player tag/);
});
test('export focus uses the current window rather than a background focused-app record', () => {
  const focused = 'mCurrentFocus=Window{1021972 u0 com.mosesml.cocwidget/com.mosesml.cocwidget.MainActivity}';
  assert.equal(isSourceFocused(focused, 'com.mosesml.cocwidget'), true);
  assert.equal(isSourceFocused(focused, 'com.supercell.clashofclans'), false);
  assert.equal(isSourceFocused('mFocusedApp=ActivityRecord{com.mosesml.cocwidget/.MainActivity}', 'com.mosesml.cocwidget'), false);
  assert.equal(isSourceFocused('mCurrentFocus=null', 'com.mosesml.cocwidget'), false);
});
test('stopping during a focus check sends no subsequent menu tap and interrupts pauses', async () => {
  const stop = new AbortController();
  let taps = 0;
  const device = new AndroidDevice('test', 'adb', '0'.repeat(64));
  device.run = async (...args) => {
    if (args.includes('dumpsys')) { stop.abort(); return 'mCurrentFocus=Window{u0 com.mosesml.cocwidget/.MainActivity}'; }
    if (args.includes('tap')) taps++;
    return '';
  };
  await assert.rejects(new AndroidExporter(device, true).action({ kind: 'tap', x: 1, y: 1, pauseMs: 1000 }, stop.signal));
  assert.equal(taps, 0);
  const pause = wait(30000, stop.signal);
  await assert.rejects(pause, /stopped/);
});

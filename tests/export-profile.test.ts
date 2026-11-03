import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateProfile } from '../scripts/lib/export-profile';

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

import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const bundle = 'native-bundles/ios-widget-runtime.bundle';
const built = spawnSync(process.execPath, ['node_modules/expo-widgets/scripts/build-bundle.mjs', '.', 'ios', bundle], { stdio: 'inherit' });
if (built.status !== 0) process.exit(built.status ?? 1);
const registry = JSON.parse(readFileSync('.expo/widget-layout.json', 'utf8'));
const context = vm.createContext({ console });
vm.runInContext(readFileSync(bundle, 'utf8'), context);
vm.runInContext(`globalThis.__expoWidgetLayout = (${registry.widgets.VillageWidget.layout});`, context);
const now = Date.now();
const account = { tag: '#IOS', name: 'My village', townHall: 16, exportedAt: now - 10000, demo: false, builders: 6,
  rows: [{ id: 'one', name: 'Archer Queen', level: 'Lv 80', end: now + 60000, lane: 'builder', extra: false }],
  nextAction: { name: 'Dragon', level: '10 → 11', reason: 'Army' } };
let count = 0;
for (const widgetFamily of ['systemSmall', 'systemMedium', 'systemLarge']) {
  for (const widgetRenderingMode of ['fullColor', 'accented']) {
    for (const village of ['all', '#IOS', '#REMOVED']) {
      for (const timestamp of [now, now + 120000]) {
        context.props = { version: 1, generatedAt: now, accounts: [account] };
        context.environment = { timestamp, widgetFamily, widgetRenderingMode, configuration: { village } };
        const tree = vm.runInContext('JSON.stringify(__expoWidgetRender(props, environment))', context);
        assert.ok(tree.includes('VStack'));
        if (village === '#REMOVED') { assert.ok(tree.includes('Village removed')); assert.ok(!tree.includes('Archer Queen')); }
        else if (timestamp > now) { assert.ok(tree.includes('No running timers')); assert.ok(!tree.includes('Archer Queen')); }
        else assert.ok(tree.includes('Archer Queen'));
        count++;
      }
    }
    context.props = registry.widgets.VillageWidget.initialProps;
    context.environment = { timestamp: now, widgetFamily, widgetRenderingMode, configuration: { village: 'all' } };
    assert.match(vm.runInContext('JSON.stringify(__expoWidgetRender(props, environment))', context), /import a village/);
    count++;
  }
}
console.log(`${count} iOS SDK runtime layout states passed. Native SwiftUI sizing and physical iPhone behavior still require device tests.`);

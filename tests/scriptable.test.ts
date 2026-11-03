import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import rawFixture from './fixtures/village-export.json';
import { prepareImport, selectAccounts } from '../integrations/scriptable/src/core';

const now = Date.now();
const village = (tag = '#IPHONE', offset = 0) => JSON.stringify({ ...rawFixture, tag, timestamp: Math.floor(now / 1000) - 60 + offset, unknown_future_field: { intact: true } });
test('iPhone integration shares freshness rules and preserves the complete latest export', () => {
  const first = prepareImport(village(), undefined, now);
  assert.equal(first.status, 'updated'); assert.deepEqual(JSON.parse(first.raw).unknown_future_field, { intact: true });
  assert.equal(prepareImport(village(), first.raw, now).status, 'unchanged');
  assert.equal(prepareImport(village('#IPHONE', -10), first.raw, now).status, 'ignored_older');
  assert.throws(() => prepareImport(village().replace('"intact":true', '"intact":false'), first.raw, now), /timestamp/);
  const second = prepareImport(village('#OTHER'), undefined, now);
  assert.deepEqual(selectAccounts([first.account, second.account], '#iphone'), [first.account]);
  assert.throws(() => selectAccounts([first.account], '#MISSING'), /not saved/);
});

/** Exercise the generated distributable with Scriptable's documented API shape. No device claims. */
function runtime(files = new Map<string, string>(), parameter?: unknown, widget = false, tag = 'all') {
  let output: unknown, rendered: any, clipboardReads = 0;
  const fm = {
    libraryDirectory: () => '/library', joinPath: (a: string, b: string) => `${a}/${b}`,
    fileExists: (path: string) => files.has(path), createDirectory: () => {},
    listContents: () => [...files.keys()].filter(path => !path.endsWith('.tmp')).map(path => path.split('/').at(-1)),
    fileSize: (path: string) => Buffer.byteLength(files.get(path)!, 'utf8') / 1024,
    readString: (path: string) => files.get(path), writeString: (path: string, text: string) => files.set(path, text),
    move: (a: string, b: string) => { files.set(b, files.get(a)!); files.delete(a); }, remove: (path: string) => files.delete(path),
  };
  class Element {
    children: any[] = [];
    addText(value: string) { const text = { text: value }; this.children.push(text); return text; }
    addDate(value: Date) { const date = { date: value, applyTimeStyle() {} }; this.children.push(date); return date; }
    addStack() { const stack = new Element(); this.children.push(stack); return stack; }
    layoutHorizontally() {} centerAlignContent() {}
    addSpacer() {} setPadding() {} presentMedium() {}
  }
  const context = vm.createContext({
    FileManager: { local: () => fm }, Color: class { constructor(readonly hex: string) {} },
    ListWidget: Element, UUID: { string: () => Math.random().toString(36).slice(2) },
    Font: { systemFont() {}, semiboldSystemFont() {}, semiboldMonospacedSystemFont() {} },
    config: { runsInWidget: widget, widgetFamily: 'medium' }, args: { shortcutParameter: parameter, widgetParameter: tag },
    Script: { name: () => 'COCWidget', complete() {}, setShortcutOutput: (value: unknown) => { output = value; }, setWidget: (value: unknown) => { rendered = value; } },
    Pasteboard: { pasteString: () => { clipboardReads++; throw new Error('Unsolicited clipboard read'); } },
  });
  const source = readFileSync(new URL('../integrations/scriptable/COCWidget.js', import.meta.url), 'utf8');
  return { run: () => vm.runInContext(`(async()=>{${source}\n})()`, context), files, get output() { return output as any; }, get rendered() { return rendered; }, get clipboardReads() { return clipboardReads; } };
}
test('generated iPhone script saves Shortcut JSON, then renders the selected widget without clipboard access', async () => {
  const input = runtime(undefined, village()); await input.run();
  assert.equal(input.output.saved, true); assert.equal(input.output.tag, '#IPHONE');
  assert.equal(input.clipboardReads, 0); assert.equal(input.files.size, 2);
  const other = runtime(input.files, village('#OTHER')); await other.run();
  assert.equal(input.files.size, 4);
  const widget = runtime(input.files, undefined, true, '#IPHONE'); await widget.run();
  assert.equal(widget.clipboardReads, 0);
  assert.ok(widget.rendered.children.some((child: any) => child.text === '#IPHONE'));
  assert.ok(!widget.rendered.children.some((child: any) => child.text === '#OTHER'));
  const before = new Map(input.files);
  const broken = runtime(input.files, '{broken'); await assert.rejects(broken.run(), /not valid JSON/);
  assert.deepEqual(input.files, before);
});

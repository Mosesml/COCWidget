/* Scriptable platform adapter. Shared domain logic is bundled above this file. */
const fm = FileManager.local();
const directory = fm.joinPath(fm.libraryDirectory(), 'COCWidget-v1');
if (!fm.fileExists(directory)) fm.createDirectory(directory, true);
const primary = new Color('#FFFFFF'), secondary = new Color('#B8B8B8');

function villagePath(tag, kind) {
  if (!/^#[A-Z0-9]{3,20}$/.test(tag)) throw new Error('Invalid village tag.');
  return fm.joinPath(directory, tag.slice(1) + '.' + kind + '.json');
}
function readBounded(path, limit) {
  const size = fm.fileSize(path); // Scriptable reports kilobytes.
  if (size == null || size * 1024 > limit + 1024) throw new Error('Saved data exceeds the size limit.');
  const text = fm.readString(path);
  if (text.length > limit) throw new Error('Saved data exceeds the size limit.');
  return text;
}
function writeComplete(path, text) {
  const temporary = path + '.' + UUID.string() + '.tmp';
  try { fm.writeString(temporary, text); fm.move(temporary, path); }
  finally { if (fm.fileExists(temporary)) fm.remove(temporary); }
}
function savedAccounts() {
  const files = fm.listContents(directory).filter(name => /^[A-Z0-9]{3,20}\.projection\.json$/.test(name)).sort();
  if (files.length > 25) throw new Error('At most 25 villages are supported.');
  return files.map(name => {
    const item = JSON.parse(readBounded(fm.joinPath(directory, name), 100000));
    if (!/^#[A-Z0-9]{3,20}$/.test(item.tag) || !Array.isArray(item.rows) || item.rows.length > 64 || !Number.isFinite(item.exportedAt)) throw new Error('Saved widget data is unreadable. Re-import this village.');
    return item;
  });
}
function importText(input) {
  if (input === null || input === undefined || input === '') throw new Error('No village JSON supplied. Copy the game export first.');
  const text = typeof input === 'string' ? input : JSON.stringify(input);
  const snapshot = COCWidgetCore.parseExport(text);
  const path = villagePath(snapshot.tag, 'export');
  if (!fm.fileExists(path) && savedAccounts().length >= 25) throw new Error('At most 25 villages are supported.');
  const previous = fm.fileExists(path) ? readBounded(path, 1000000) : undefined;
  const result = COCWidgetCore.prepareImport(text, previous);
  // Save the complete original export before its small widget cache; a retry repairs an interrupted cache write.
  writeComplete(path, result.raw);
  writeComplete(villagePath(snapshot.tag, 'projection'), JSON.stringify(result.account));
  return result;
}
function text(parent, value, size = 12, muted = false, bold = false) {
  const label = parent.addText(value);
  label.font = bold ? Font.semiboldSystemFont(size) : Font.systemFont(size);
  label.textColor = muted ? secondary : primary;
  label.lineLimit = 1;
  return label;
}
function render(accounts, parameter) {
  const widget = new ListWidget();
  widget.backgroundColor = new Color('#101010'); widget.setPadding(16, 16, 16, 16);
  widget.url = 'scriptable:///run?scriptName=' + encodeURIComponent(Script.name());
  const small = config.widgetFamily === 'small', large = config.widgetFamily === 'large';
  const now = Date.now();
  let selected;
  try { selected = COCWidgetCore.selectAccounts(accounts, parameter || ''); }
  catch (error) { text(widget, 'COCWidget', 17, false, true); widget.addSpacer(8); const note = text(widget, error.message, 12, true); note.lineLimit = 4; return widget; }
  const single = selected.length === 1;
  text(widget, single ? selected[0].name : 'Your villages', small ? 16 : 18, false, true);
  widget.addSpacer(7);
  if (!selected.length) { const note = text(widget, 'Run this script and import a village to begin.', 12, true); note.lineLimit = 3; }
  const ends = [];
  for (const account of selected.slice(0, single ? 1 : small ? 1 : large ? 4 : 2)) {
    const active = account.rows.filter(row => row.end > now).sort((a, b) => a.end - b.end);
    const busy = active.filter(row => row.lane === 'builder' && !row.extra).length;
    text(widget, single ? 'TH ' + account.townHall + ' · ' + Math.max(0, account.builders - busy) + '/' + account.builders + ' builders free*' : account.name + ' · TH ' + account.townHall, 11, true);
    widget.addSpacer(5);
    for (const row of active.slice(0, single ? small ? 1 : large ? 4 : 2 : 1)) {
      const line = small ? widget : widget.addStack();
      if (!small) { line.layoutHorizontally(); line.centerAlignContent(); }
      text(line, row.name, 12, false, true);
      if (!small) line.addSpacer(8);
      // Absolute finish times stay correct when iOS postpones a widget reload.
      // Scriptable timer dates count upward after their deadline and cannot clamp at zero.
      const finish = line.addDate(new Date(row.end)); finish.applyTimeStyle(); finish.textColor = primary; finish.font = Font.semiboldMonospacedSystemFont(small ? 20 : 15);
      if (large) text(widget, row.level + ' · ' + new Date(row.end).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }), 10, true);
      ends.push(row.end); widget.addSpacer(5);
    }
    if (!active.length) text(widget, 'No running timers', 12);
    if (large && single && account.nextAction) text(widget, 'Next · ' + account.nextAction.name + ' ' + account.nextAction.level, 12, true);
  }
  widget.addSpacer();
  const account = single ? selected[0] : null;
  text(widget, account ? (now - account.exportedAt > 86400000 ? 'Old export ' : 'Saved ') + new Date(account.exportedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + ' · Estimates' : (selected.some(item => now - item.exportedAt > 86400000) ? 'Older snapshots' : 'Saved snapshots') + ' · Estimates', 10, true);
  widget.refreshAfterDate = new Date(ends.length ? Math.max(now + 60000, Math.min(...ends) + 1000) : now + 1800000);
  return widget;
}
async function main() {
  if (config.runsInWidget) { Script.setWidget(render(savedAccounts(), args.widgetParameter)); Script.complete(); return; }
  // Only explicitly provided Shortcut input or an explicit Import action reads game data.
  if (args.shortcutParameter !== null && args.shortcutParameter !== undefined) {
    const result = importText(args.shortcutParameter);
    Script.setShortcutOutput({ status: result.status, tag: result.account.tag, exportedAt: result.account.exportedAt, saved: true, refresh: 'iOS scheduled' });
    Script.complete(); return;
  }
  const menu = new Alert(); menu.title = 'COCWidget'; menu.message = 'Local village widgets. Copy JSON from Clash before importing.';
  menu.addAction('Import copied JSON'); menu.addAction('Preview widget'); menu.addCancelAction('Cancel');
  const action = await menu.presentSheet();
  if (action === 0) {
    const result = importText(Pasteboard.pasteString());
    const confirmation = new Alert(); confirmation.title = result.status === 'ignored_older' ? 'Older export ignored' : 'Village saved';
    confirmation.message = result.account.tag + '. iOS controls when Home Screen widgets reload.'; confirmation.addAction('OK'); await confirmation.presentAlert();
  }
  if (action === 0 || action === 1) await render(savedAccounts(), '').presentMedium();
  Script.complete();
}
await main();

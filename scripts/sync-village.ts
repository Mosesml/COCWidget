import { parseArgs } from 'node:util';
import { randomUUID } from 'node:crypto';
import { AndroidDevice } from './lib/android';
import { readExport, watchExports } from './lib/watch';
import { syncLink } from '../src/core/sync';

async function main() {
  const { values } = parseArgs({ options: {
    file: { type: 'string' }, watch: { type: 'string' }, device: { type: 'string' },
    adb: { type: 'string' }, url: { type: 'boolean' }, help: { type: 'boolean', short: 'h' },
  } });
  if (values.help) {
    console.log(`Send village JSON directly to an Android home-screen widget, with acknowledgement.
  
  npm run sync -- --device SERIAL --file village.json
  npm run sync -- --device SERIAL --watch /path/to/export-folder
  npm run sync -- --file village.json --url
  
  Enable Automatic imports once in the native app. A watcher delivers new valid JSON,
  retries failures, and never marks an unacknowledged import as successful.
  This watches available exports; use export:android for calibrated game-menu export.`);
  } else {
    try {
      if (!!values.file === !!values.watch) throw new Error('Choose exactly one of --file or --watch.');
      if (values.url) {
        if (!values.file) throw new Error('--url requires --file.');
        const { text } = await readExport(values.file);
        console.log(syncLink(text, randomUUID()));
      } else {
        if (!values.device) throw new Error('Specify --device SERIAL (find it with adb devices).');
        const device = new AndroidDevice(values.device, values.adb);
        await device.check();
        if (values.file) {
          const { text } = await readExport(values.file), result = await device.deliver(text);
          if (!result.widgetUpdated) throw new Error(result.message ?? `Delivery was ${result.status}.`);
          console.log(`${result.status}: ${result.tag} · widget acknowledged`);
        } else {
          const stop = new AbortController();
          process.once('SIGINT', () => stop.abort()); process.once('SIGTERM', () => stop.abort());
          console.log('Watching exports. Ctrl+C stops the watcher.');
          await watchExports({ source: values.watch!, deliver: text => device.deliver(text), log: console.log, signal: stop.signal });
        }
      }
    } catch (error) { console.error(error instanceof Error ? error.message : 'Sync failed.'); process.exitCode = 1; }
  }
}
void main().catch(error => { console.error(error.message); process.exitCode = 1; });

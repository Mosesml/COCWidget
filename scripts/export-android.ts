import { parseArgs } from 'node:util';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { AndroidDevice } from './lib/android';
import { AndroidExporter } from './lib/game-export';
import { validateProfile, type ExportAction, type ExportProfile } from './lib/export-profile';

async function calibrate(exporter: AndroidExporter, filename: string) {
  const prompts = createInterface({ input: stdin, output: stdout });
  const actions: ExportAction[] = [], output = resolve(filename);
  await mkdir(dirname(output), { recursive: true });
  try {
    console.log('Start with your village visible. Record only the Settings → Data Export → Copy path, then close its menus back to the village.');
    await exporter.launch(exporter.testSource ? 1000 : 15000);
    let screen = await exporter.screenshot();
    const width = screen.width, height = screen.height;
    console.log(`Screen: ${width} × ${height}. Each current screenshot is saved beside the profile.`);
    while (actions.length < 24) {
      await writeFile(`${output}.screen.png`, screen.png);
      const command = (await prompts.question('tap x y | swipe x y endX endY | back | undo | done: ')).trim().split(/\s+/);
      if (command[0] === 'done') break;
      if (command[0] === 'undo') { actions.pop(); console.log('Removed the last recorded action; restore the matching source screen manually.'); continue; }
      let action: ExportAction;
      if (command[0] === 'tap' && command.length === 3) action = { kind: 'tap', x: Number(command[1]), y: Number(command[2]), pauseMs: 1000 };
      else if (command[0] === 'swipe' && command.length === 5) action = { kind: 'swipe', x: Number(command[1]), y: Number(command[2]), endX: Number(command[3]), endY: Number(command[4]), durationMs: 500, pauseMs: 1000 };
      else if (command[0] === 'back') action = { kind: 'back', pauseMs: 1000 };
      else { console.log('Enter one of the displayed commands.'); continue; }
      try {
        validateProfile({ version: 1, width, height, launchWaitMs: 15000, actions: [...actions, action] });
        await exporter.action(action); actions.push(action); screen = await exporter.screenshot();
      } catch (error) { console.log((error as Error).message); }
    }
    const playerTag = (await prompts.question('Expected player tag (optional, e.g. #ABC123): ')).trim() || undefined;
    const profile = validateProfile({ version: 1, width, height, launchWaitMs: exporter.testSource ? 1000 : 15000, playerTag, actions });
    await writeFile(output, JSON.stringify(profile, null, 2) + '\n', { mode: 0o600, flag: 'wx' });
    console.log(`Saved ${output}. Test one export before enabling an interval.`);
  } finally { prompts.close(); }
}
async function main() {
  const { values } = parseArgs({ options: {
    device: { type: 'string' }, adb: { type: 'string' }, profile: { type: 'string' },
    calibrate: { type: 'string' }, interval: { type: 'string' },
    'test-source': { type: 'boolean' }, help: { type: 'boolean', short: 'h' },
  } });
  if (values.help) {
    console.log(`Automate Clash's export menu on an unlocked, connected Android device.

npm run export:android -- --device SERIAL --calibrate /private/path/device.json
npm run export:android -- --device SERIAL --profile /private/path/device.json
npm run export:android -- --device SERIAL --profile /private/path/device.json --interval 900

Keep the village visible between cycles. Calibration includes menu cleanup. The script
stops on a focus/size mismatch or missing fresh JSON; it never acknowledges stale data.
An interval keeps the source device occupied briefly each cycle and requires the host
script, USB debugging and an unlocked device. Ctrl+C stops it.`);
    return;
  }
  if (!values.device || (!!values.calibrate === !!values.profile)) throw new Error('Specify --device and exactly one of --calibrate or --profile.');
  const device = new AndroidDevice(values.device, values.adb); await device.check();
  const exporter = new AndroidExporter(device, values['test-source']);
  if (values.calibrate) { await calibrate(exporter, values.calibrate); return; }
  const profile = validateProfile(JSON.parse(await readFile(values.profile!, 'utf8')));
  const interval = values.interval === undefined ? 0 : Number(values.interval);
  if (values.interval !== undefined && (!Number.isInteger(interval) || interval < 60 || interval > 86400)) throw new Error('--interval must be 60–86400 seconds.');
  const stop = new AbortController();
  process.once('SIGINT', () => stop.abort()); process.once('SIGTERM', () => stop.abort());
  do {
    if (stop.signal.aborted) break;
    console.log('Exporting village data…');
    const result = await exporter.export(profile, stop.signal);
    console.log(`${result.status}: ${result.tag} · fresh export saved and widget acknowledged`);
    if (!interval || stop.signal.aborted) break;
    console.log(`Next export in ${interval} seconds.`);
    await new Promise<void>(resolveWait => {
      const done = () => { clearTimeout(timer); stop.signal.removeEventListener('abort', done); resolveWait(); };
      const timer = setTimeout(done, interval * 1000);
      stop.signal.addEventListener('abort', done, { once: true });
      if (stop.signal.aborted) done();
    });
  } while (!stop.signal.aborted);
}
void main().catch(error => { console.error(error.message); process.exitCode = 1; });

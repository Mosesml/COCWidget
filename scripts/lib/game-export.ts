import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { AndroidDevice, wait } from './android';
import { validateProfile, type ExportAction, type ExportProfile } from './export-profile';

const exec = promisify(execFile);
const gamePackage = 'com.supercell.clashofclans';
export function isSourceFocused(windows: string, packageName: string) {
  const focused = windows.split('\n').find(line => line.includes('mCurrentFocus='));
  return focused?.includes(`${packageName}/`) ?? false;
}
export class AndroidExporter {
  readonly packageName: string;
  constructor(readonly device: AndroidDevice, readonly testSource = false) {
    this.packageName = testSource ? 'com.mosesml.cocwidget' : gamePackage;
  }
  async screenshot() {
    const { stdout } = await exec(this.device.adb, ['-s', this.device.serial, 'exec-out', 'screencap', '-p'], { encoding: 'buffer', timeout: 15000, maxBuffer: 16_000_000 });
    if (stdout.length < 24 || stdout.toString('ascii', 1, 4) !== 'PNG') throw new Error('Android did not return a PNG screenshot.');
    return { png: stdout, width: stdout.readUInt32BE(16), height: stdout.readUInt32BE(20) };
  }
  async launch(waitMs: number) {
    if (this.testSource) {
      await this.device.run('shell', 'am', 'start', '-W', '-a', 'android.intent.action.VIEW', '-d', 'cocwidget://test-export', this.packageName);
    } else {
      const packages = await this.device.run('shell', 'pm', 'list', 'packages', gamePackage);
      if (!packages.split('\n').some(line => line.trim() === `package:${gamePackage}`)) throw new Error('Clash of Clans is not installed on this device.');
      const activity = (await this.device.run('shell', 'cmd', 'package', 'resolve-activity', '--brief', '-c', 'android.intent.category.LAUNCHER', gamePackage)).split('\n').find(line => line.startsWith(`${gamePackage}/`));
      if (!activity) throw new Error('The Clash of Clans launcher activity could not be resolved.');
      await this.device.run('shell', 'am', 'start', '-W', '-n', activity);
    }
    await wait(waitMs); await this.assertForeground();
  }
  async assertForeground() {
    // Android 14 keeps mCurrentFocus in the displays section, not the windows section.
    let windows = await this.device.run('shell', 'dumpsys', 'window', 'displays');
    if (!windows.includes('mCurrentFocus=')) windows = await this.device.run('shell', 'dumpsys', 'window');
    if (!isSourceFocused(windows, this.packageName)) throw new Error('The export source is not focused. Unlock the device, close overlays, and retry. No menu tap was sent.');
  }
  async action(action: ExportAction) {
    await this.assertForeground();
    if (action.kind === 'tap') await this.device.run('shell', 'input', 'tap', String(action.x), String(action.y));
    else if (action.kind === 'swipe') await this.device.run('shell', 'input', 'swipe', String(action.x), String(action.y), String(action.endX), String(action.endY), String(action.durationMs));
    else await this.device.run('shell', 'input', 'keyevent', '4');
    await wait(action.pauseMs);
  }
  async export(profile: ExportProfile, signal?: AbortSignal) {
    const p = validateProfile(profile);
    await this.launch(p.launchWaitMs);
    const screen = await this.screenshot();
    if (screen.width !== p.width || screen.height !== p.height) throw new Error('Screen size/orientation differs from calibration. Recalibrate before exporting.');
    const notBefore = Number(await this.device.run('shell', 'date', '+%s')) * 1000;
    if (!Number.isSafeInteger(notBefore)) throw new Error('Could not read the device clock.');
    for (const action of p.actions) {
      if (signal?.aborted) throw new Error('Export stopped.');
      await this.action(action);
    }
    if (signal?.aborted) throw new Error('Export stopped.');
    const result = await this.device.clipboard(notBefore, p.playerTag);
    if (!result.widgetUpdated) throw new Error(result.message ?? 'The widget did not acknowledge the export.');
    return result;
  }
}

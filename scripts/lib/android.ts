import { spawn, execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { randomUUID } from 'node:crypto';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { SyncResult } from '../../src/core/sync';

const exec = promisify(execFile);
export const wait = (milliseconds: number) => new Promise(resolve => setTimeout(resolve, milliseconds));
export class AndroidDevice {
  constructor(readonly serial: string, readonly adb = process.env.ADB ?? 'adb', readonly token = process.env.COCWIDGET_TOKEN) {
    if (!/^[A-Za-z0-9_.:-]{1,100}$/.test(serial)) throw new Error('Specify a valid Android device serial.');
  }
  async run(...args: string[]) {
    const result = await exec(this.adb, ['-s', this.serial, ...args], { timeout: 30_000, maxBuffer: 2_000_000 });
    return result.stdout.trim();
  }
  async check() {
    if (!this.token || !/^[a-f0-9]{64}$/.test(this.token)) throw new Error('Set COCWIDGET_TOKEN to the automation pairing code copied from COCWidget settings.');
    if (await this.run('get-state') !== 'device') throw new Error('The selected Android device is not ready.');
    const packages = await this.run('shell', 'pm', 'list', 'packages', 'com.mosesml.cocwidget');
    if (!packages.split('\n').some(line => line.trim() === 'package:com.mosesml.cocwidget')) throw new Error('Install the native COCWidget app on this device first.');
  }
  async deliver(text: string, timeout = 20_000): Promise<SyncResult> {
    const id = randomUUID();
    if (Buffer.byteLength(text, 'utf8') > 1_000_000) throw new Error('Export exceeds the 1 MB transport limit.');
    const directory = await mkdtemp(join(tmpdir(), 'cocwidget-'));
    const local = join(directory, `${id}.json`);
    const remoteDirectory = '/sdcard/Android/data/com.mosesml.cocwidget/files/imports';
    const remote = `${remoteDirectory}/${id}.json`;
    try {
      await writeFile(local, text, { mode: 0o600 });
      await this.run('shell', 'mkdir', '-p', remoteDirectory);
      await this.run('push', local, remote);
      return await this.deliverLink(`cocwidget://sync-file?requestId=${id}&background=1&token=${this.token}`, id, timeout);
    } finally {
      await rm(directory, { recursive: true, force: true });
      await this.run('shell', 'rm', '-f', remote).catch(() => {});
    }
  }
  async clipboard(notBefore: number, tag?: string, timeout = 20_000) {
    const id = randomUUID();
    const uri = `cocwidget://sync-clipboard?requestId=${id}&background=1&token=${this.token}&notBefore=${Math.floor(notBefore / 1000)}${tag ? `&tag=${encodeURIComponent(tag)}` : ''}`;
    return this.deliverLink(uri, id, timeout);
  }
  private async deliverLink(uri: string, requestId: string, timeout: number): Promise<SyncResult> {
    // Listen first; starting an Activity is not proof that data reached the widget.
    const logs = spawn(this.adb, ['-s', this.serial, 'logcat', '-v', 'raw', '-T', '1', '-s', 'CocWidgetSync:I', '*:S'], { stdio: ['ignore', 'pipe', 'pipe'] });
    let buffer = '';
    let timer: ReturnType<typeof setTimeout>;
    let settle: (result: SyncResult) => void;
    let reject: (error: Error) => void;
    const acknowledged = new Promise<SyncResult>((resolve, fail) => {
      settle = resolve; reject = fail;
      timer = setTimeout(() => fail(new Error('No widget acknowledgement arrived. No successful delivery was recorded; retry the same export.')), timeout);
      logs.on('error', error => fail(new Error(`Could not read Android delivery results: ${error.message}`)));
      logs.on('exit', code => { if (code !== null) fail(new Error('Android delivery-result stream closed.')); });
      logs.stdout.on('data', chunk => {
        buffer += chunk.toString();
        if (buffer.length > 16384) buffer = buffer.slice(-8192);
        let end: number;
        while ((end = buffer.indexOf('\n')) >= 0) {
          const line = buffer.slice(0, end).trim(); buffer = buffer.slice(end + 1);
          try {
            const result = JSON.parse(line) as SyncResult;
            if (result.requestId === requestId && isSyncResult(result)) settle(result);
          } catch {}
        }
      });
    });
    logs.stderr.resume();
    // Install rejection handling before ADB launch, including an immediate missing-binary failure.
    void acknowledged.catch(() => {});
    try {
      // Explicit shell quoting protects '&' separators and encoded JSON from the device shell.
      const quoted = `'${uri.replaceAll("'", "'\\''")}'`;
      const launch = await this.run('shell', 'am', 'start', '-W', '-a', 'android.intent.action.VIEW', '-d', quoted, 'com.mosesml.cocwidget');
      if (/^Error:|^Exception|unable to resolve/im.test(launch)) throw new Error('Android could not open the native sync receiver.');
      return await acknowledged;
    } catch (error) {
      reject!(error as Error);
      throw error;
    } finally { clearTimeout(timer!); logs.kill(); }
  }
}
export function isSyncResult(result: unknown): result is SyncResult {
  if (!result || typeof result !== 'object') return false;
  const r = result as SyncResult;
  return ['updated', 'unchanged', 'ignored_older', 'disabled', 'failed'].includes(r.status)
    && typeof r.widgetUpdated === 'boolean' && Number.isSafeInteger(r.completedAt)
    && (!r.widgetUpdated || (['updated', 'unchanged', 'ignored_older'].includes(r.status)
      && typeof r.tag === 'string' && /^#[A-Z0-9]{3,20}$/.test(r.tag) && Number.isSafeInteger(r.exportedAt)));
}

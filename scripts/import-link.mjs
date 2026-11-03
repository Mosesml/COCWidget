import { readFile } from 'node:fs/promises';

const filename = process.argv[2];
let text = '';
if (filename) text = await readFile(filename, 'utf8');
else for await (const chunk of process.stdin) {
  text += chunk;
  if (text.length > 1_000_000) throw new Error('Export exceeds the 1 MB limit.');
}
if (text.length > 1_000_000) throw new Error('Export exceeds the 1 MB limit.');
const value = JSON.parse(text);
if (!value || typeof value.tag !== 'string' || !/^#[A-Z0-9]{3,20}$/i.test(value.tag) ||
    !Number.isSafeInteger(value.timestamp) || !Array.isArray(value.buildings)) {
  throw new Error('Expected an in-game village export with tag, timestamp and buildings.');
}
process.stdout.write(`cocwidget://import?data=${encodeURIComponent(JSON.stringify(value))}\n`);

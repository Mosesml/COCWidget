import React, { useEffect, useState } from 'react';
import { Linking, Platform, Pressable, Text, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useApp } from '../app/context';
import { catalogueSource, currentSnapshot } from '../core/catalogue';
import { parseExport } from '../core/import';
import { compareMagicItem, duration } from '../core/time';
import { decodeBackup, encodeBackup, validatePreferences } from '../core/workspace';
import { widgetProjection } from '../core/widgets';
import type { Entity, Snapshot, Workspace } from '../core/types';
import { Art } from './artwork';
import { Button, Card, Chip, Empty, ErrorNote, Field, Icon, SectionTitle, Sheet, styles } from './components';
import { color, font } from './theme';

export async function chooseJson(): Promise<string | null> {
  const result = await DocumentPicker.getDocumentAsync({ type: ['application/json', 'text/plain'], copyToCacheDirectory: true });
  if (result.canceled) return null;
  const asset = result.assets[0]!;
  if (asset.size && asset.size > 20_000_000) throw new Error('This file exceeds the 20 MB limit.');
  if (Platform.OS === 'web') {
    if (asset.file) return asset.file.text();
    return (await fetch(asset.uri)).text();
  }
  return new File(asset.uri).text();
}
export async function saveBackup(workspace: Workspace) {
  const text = encodeBackup(workspace);
  if (Platform.OS === 'web') {
    const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
    const element = document.createElement('a'); element.href = url; element.download = 'cocwidget-backup.json'; element.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000); return;
  }
  const file = new File(Paths.cache, 'cocwidget-backup.json'); file.write(text);
  if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(file.uri, { mimeType: 'application/json', dialogTitle: 'Save COCWidget backup', UTI: 'public.json' });
  else throw new Error('File sharing is not available on this device.');
}
export function ImportDialog({ workspace, initial = '', onClose, onSave }: { workspace: Workspace; initial?: string; onClose: () => void; onSave: (snapshot: Snapshot, name: string) => Promise<unknown> }) {
  const [text, setText] = useState(initial), [error, setError] = useState(''), [preview, setPreview] = useState<Snapshot | null>(null), [name, setName] = useState(''), [busy, setBusy] = useState(false);
  const change = (value: string) => { setText(value); setPreview(null); setError(''); };
  const paste = async () => { try { change(await Clipboard.getStringAsync()); } catch { setError('Clipboard access was unavailable. Paste the text into the box directly.'); } };
  const pick = async () => { try { const data = await chooseJson(); if (data !== null) change(data); } catch (e) { setError((e as Error).message); } };
  const check = (value = text) => { try { const result = parseExport(value); setPreview(result); setName(workspace.accounts.find(a => a.tag === result.tag)?.name ?? ''); setError(''); } catch (e) { setError((e as Error).message); } };
  useEffect(() => { if (initial) { setText(initial); setPreview(null); check(initial); } }, [initial]);
  const save = async () => { if (!preview) return; setBusy(true); try { await onSave(preview, name); onClose(); } catch (e) { setError((e as Error).message); } finally { setBusy(false); } };
  return <Sheet title={preview ? 'Review your village' : 'Bring your village along'} subtitle={preview ? 'Save this snapshot to update your plan and home-screen widgets.' : 'Copy your village export in Clash of Clans, then paste it here.'} onClose={onClose}>
    {!preview && <><View style={{ gap: 10, backgroundColor: color.limeLight, padding: 16, borderRadius: 14 }}><Text style={[styles.body, { fontWeight: '600' }]}>Settings → More Settings → Data Export → Copy</Text><Text style={styles.caption}>Everything stays on this device. After saving, your widget receives the updated village automatically.</Text></View>
    <View style={[styles.row, { flexWrap: 'wrap' }]}><Button tone="secondary" onPress={() => void paste()} icon="import">Paste from clipboard</Button><Button tone="ghost" onPress={() => void pick()} icon="book">Choose JSON file</Button></View>
    <Field label="Village export JSON" value={text} onChange={change} placeholder={'{"tag":"#YOURTAG","timestamp":…,"buildings":[…]}'} multiline testID="import-json" /></>}
    {!!error && <ErrorNote message={error} />}
    {preview && <Card style={{ backgroundColor: color.canvas, padding: 18 }}>
      <View style={styles.row}><Chip>Town Hall {preview.townHall}</Chip><Text style={styles.body}>{preview.tag}</Text></View>
      <Text style={styles.caption}>{preview.entities.length} inventory records · {preview.entities.filter(e => e.timer !== undefined).length} timers</Text>
      <Text style={styles.caption}>Exported {new Date(preview.exportedAt).toLocaleString()}</Text>
      <Field label="Village name (optional)" value={name} onChange={setName} placeholder="My main village" />
      {preview.warnings.map(warning => <Text key={warning} style={[styles.caption, { color: '#926E34' }]}>{warning}</Text>)}
    </Card>}
    <Button onPress={preview ? () => void save() : () => check()} disabled={!text.trim()} busy={busy} icon={preview ? 'check' : 'search'} testID="preview-import">{preview ? 'Save village & update widgets' : 'Preview village'}</Button>
    {preview && <Button tone="ghost" disabled={busy} onPress={() => { setPreview(null); setError(''); }}>Edit JSON</Button>}
  </Sheet>;
}
export function BackupDialog({ onClose, replace }: { onClose: () => void; replace: (workspace: Workspace) => Promise<unknown> }) {
  const [text, setText] = useState(''), [preview, setPreview] = useState<Workspace | null>(null), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const pick = async () => { try { const data = await chooseJson(); if (data) { setText(data); setPreview(null); } } catch (e) { setError((e as Error).message); } };
  const submit = async () => { setBusy(true); try { if (preview) { await replace(preview); onClose(); } else setPreview(decodeBackup(text)); } catch (e) { setError((e as Error).message); } finally { setBusy(false); } };
  return <Sheet title="Restore a backup" subtitle="Review your backup before replacing this device’s workspace." onClose={onClose}>
    <Button tone="secondary" onPress={() => void pick()} icon="book">Choose backup file</Button>
    <Field label="Backup JSON" value={text} onChange={value => { setText(value); setPreview(null); }} multiline />
    {preview && <ErrorNote message={`This will replace the current local workspace with ${preview.accounts.length} saved villages. Export a backup of your current data first if you need to keep it.`} />}
    {!!error && <ErrorNote message={error} />}
    <Button disabled={!text.trim()} busy={busy} tone={preview ? 'danger' : 'primary'} onPress={() => void submit()}>{preview ? 'Replace this device’s workspace' : 'Review backup'}</Button>
  </Sheet>;
}
export function SettingsDialog({ onClose, backup, restore, rename }: { onClose: () => void; backup: () => void; restore: () => void; rename: (name: string) => Promise<unknown> }) {
  const app = useApp(), p = app.account.preferences;
  const [name, setName] = useState(app.account.name), [builders, setBuilders] = useState(String(p.builders)), [baseBuilders, setBaseBuilders] = useState(String(p.builderBaseBuilders));
  const [start, setStart] = useState(String(p.onlineStart)), [end, setEnd] = useState(String(p.onlineEnd)), [discount, setDiscount] = useState(String(p.discount)), [error, setError] = useState('');
  const save = async () => {
    try {
      const next = validatePreferences({ ...p, builders: Number(builders), builderBaseBuilders: Number(baseBuilders), onlineStart: Number(start), onlineEnd: Number(end), discount: Number(discount) });
      const saved = await app.preferences(next); if (!saved) return;
      await rename(name); app.notify('Village preferences saved.'); onClose();
    } catch (e) { setError((e as Error).message); }
  };
  return <Sheet title="Make the plan yours" subtitle="These settings belong to this village." onClose={onClose}>
    <Field label="Village name" value={name} onChange={setName} />
    <View style={styles.row}><Field label="Home builders (1–6)" value={builders} onChange={setBuilders} numeric /><Field label="Base builders (1–3)" value={baseBuilders} onChange={setBaseBuilders} numeric /></View>
    <View style={styles.row}><Field label="Online from (0–23)" value={start} onChange={setStart} numeric /><Field label="Online until (0–23)" value={end} onChange={setEnd} numeric /></View>
    <Text style={styles.caption}>Hours use your device’s time zone. Equal start/end means all day; overnight windows are supported.</Text>
    <Field label="Future cost/time discount (0–20%)" value={discount} onChange={setDiscount} numeric />
    <Text style={styles.caption}>Applies only to future queued work. Imported timers already include their recorded duration discounts.</Text>
    {!!error && <ErrorNote message={error} />}<Button onPress={() => void save()} icon="check">Save preferences</Button>
    <View style={{ height: 1, backgroundColor: color.line }} /><SectionTitle title="Your data" />
    <View style={[styles.row, { flexWrap: 'wrap' }]}><Button tone="secondary" onPress={backup} icon="share">Export backup</Button><Button tone="ghost" onPress={restore} icon="import">Restore backup</Button></View>
    <Text style={styles.caption}>Game catalogue: ClashKing Assets · {catalogueSource.commit.slice(0, 8)}. Costs and requirements are estimates from this pinned version.</Text>
    <Button tone="ghost" onPress={() => void Linking.openURL('https://assets.clashk.ing')}>ClashKing data & attribution ↗</Button>
    <Text style={styles.caption}>Unofficial fan companion. Clash of Clans and related assets belong to Supercell.</Text>
  </Sheet>;
}
export function InventoryDialog({ onClose }: { onClose: () => void }) {
  const { snapshot } = useApp();
  const [query, setQuery] = useState(''), [village, setVillage] = useState('all'), [selected, setSelected] = useState<Entity | null>(null);
  const rows = snapshot.entities.filter(e => (village === 'all' || e.village === village) && `${e.name} ${e.id} ${e.kind}`.toLowerCase().includes(query.toLowerCase()));
  return <Sheet title="Your complete inventory" subtitle={`${snapshot.entities.length} records, including idle items and nested modules.`} onClose={onClose} wide>
    <Field label="Find a building, troop, item or game ID" value={query} onChange={setQuery} placeholder="Try Queen, equipment, or 1000010" />
    <View style={styles.row}>{['all', 'home', 'builder', 'shared'].map(type => <Button key={type} compact tone={village === type ? 'primary' : 'secondary'} onPress={() => setVillage(type)}>{type === 'all' ? 'Everything' : type === 'home' ? 'Home' : type === 'builder' ? 'Builder Base' : 'Shared'}</Button>)}</View>
    {selected && <Card style={{ backgroundColor: color.canvas }}><SectionTitle title={selected.name} action={<Button tone="ghost" compact onPress={() => setSelected(null)}>Close</Button>} /><Text selectable style={{ color: color.ink, fontFamily: 'monospace', fontSize: 12, lineHeight: 20 }}>{JSON.stringify(selected.raw, null, 2)}</Text></Card>}
    <Text style={styles.caption}>{rows.length} matching records. Tap any row to inspect the original fields.</Text>
    {rows.slice(0, 150).map(entity => <Pressable accessibilityRole="button" key={entity.key} onPress={() => setSelected(entity)} style={[styles.row, { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: color.line }]}><Art id={entity.id} size={36} icon="grid" /><View style={{ flex: 1, gap: 4 }}><Text style={[styles.body, { fontSize: 13, fontWeight: '600' }]}>{entity.name}</Text><Text style={styles.caption}>{entity.kind} · {entity.id}{entity.parentKey ? ' · Nested' : ''}</Text></View><Text style={styles.body}>{entity.count > 1 ? `${entity.count} × ` : ''}{entity.level !== null ? `Lv ${entity.level}` : 'Owned'}</Text><Icon name="chevron" size={16} /></Pressable>)}
    {rows.length > 150 && <Text style={styles.caption}>Showing the first 150 matches. Narrow your search to inspect the rest.</Text>}
  </Sheet>;
}
export function MagicDialog({ onClose }: { onClose: () => void }) {
  const { snapshot, now } = useApp();
  const [type, setType] = useState<'builderPotion' | 'researchPotion' | 'bookBuilding' | 'bookHeroes'>('builderPotion');
  const result = compareMagicItem(snapshot, now, type);
  return <Sheet title="A little magic, well spent" subtitle="Compare a hypothetical item use against your current timers." onClose={onClose}>
    <View style={[styles.row, { flexWrap: 'wrap' }]}>{([['builderPotion', 'Builder Potion'], ['researchPotion', 'Research Potion'], ['bookBuilding', 'Book of Building'], ['bookHeroes', 'Book of Heroes']] as const).map(([key, label]) => <Button key={key} compact tone={type === key ? 'primary' : 'secondary'} onPress={() => setType(key)}>{label}</Button>)}</View>
    <Card style={{ backgroundColor: color.limeLight }}><Text style={{ color: color.green, fontFamily: font, fontSize: 38, fontWeight: '600', fontVariant: ['tabular-nums'] }}>{duration(result.totalSeconds)}</Text><Text style={styles.body}>Potential {result.measure} saved</Text></Card>
    {result.savings.slice(0, 8).map((row, index) => <View key={`${row.name}:${index}`} style={[styles.row, { justifyContent: 'space-between' }]}><Text style={styles.body}>{row.name}</Text><Text style={styles.caption}>{duration(row.seconds)} saved</Text></View>)}
    {!result.savings.length && <Text style={styles.caption}>No eligible running upgrades in this snapshot.</Text>}
    <Text style={styles.caption}>This does not use an item in-game or change your saved timers. Builder Potion calculations account for boost expiry rather than subtracting a flat nine hours from every job. Your magic-item inventory is not included in the export.</Text>
  </Sheet>;
}
export function WidgetDialog({ onClose }: { onClose: () => void }) {
  const { workspace, now } = useApp(), projection = widgetProjection(workspace, now);
  return <Sheet title="A home for your next move" subtitle="Native widgets use your saved village data on iOS and Android." onClose={onClose}>
    {projection.accounts.map(account => <View key={account.tag} style={{ backgroundColor: color.forest, padding: 24, borderRadius: 22, gap: 15 }}>
      <View style={[styles.row, { justifyContent: 'space-between' }]}><Text style={{ fontFamily: font, color: '#EFF5E7', fontSize: 18, fontWeight: '600' }}>{account.name}</Text><Icon name="leaf" tint="#C5DDA4" /></View>
      <Text style={{ color: '#BDCEB0', fontSize: 11 }}>TH {account.townHall} · {account.demo ? 'Sample village' : account.tag}</Text>
      {account.rows.filter(r => r.end > now).slice(0, 3).map(row => <View key={row.id} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}><Text style={{ color: '#E5EEDC', fontSize: 13 }}>{row.name}</Text><Text style={{ color: '#D8E9BC', fontSize: 13, fontVariant: ['tabular-nums'] }}>{duration((row.end - now) / 1000)}</Text></View>)}
      {account.nextAction && <Text style={{ color: '#BDCEB0', fontSize: 12 }}>Next: {account.nextAction.name} {account.nextAction.level}</Text>}
      <Text style={{ color: '#ACBBA2', fontSize: 10 }}>Exported {new Date(account.exportedAt).toLocaleString()} · Estimates</Text>
    </View>)}
    <Text style={[styles.body, { fontWeight: '600' }]}>Add a widget</Text><Text style={styles.caption}>Install a native development or release build. Long-press your home screen, choose Widgets, then COCWidget. On iOS, edit the widget to choose a village or all accounts. On Android, choose an account when adding each widget.</Text>
    <Text style={styles.caption}>These previews use your actual saved projections. Browser previews and Expo Go do not install home-screen widgets. The native build and device checks are tracked separately in the project goals.</Text>
    <View style={{ padding: 16, backgroundColor: color.canvas, borderRadius: 14, gap: 8 }}><Text style={[styles.body, { fontWeight: '600' }]}>Can imports be automatic?</Text><Text style={styles.caption}>After importing, widget updates are automatic. Fresh village exports still start with Copy in the game. An iOS Shortcut can pass the clipboard to cocwidget://import?data=URL_ENCODED_JSON, which opens an import preview. Android supports explicit paste and JSON file import. We do not read the clipboard in the background.</Text></View>
  </Sheet>;
}

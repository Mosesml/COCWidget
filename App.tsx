import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, AppState, Button, Linking, Platform, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Clipboard from 'expo-clipboard';
import * as Crypto from 'expo-crypto';
import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { useWorkspace } from './src/app/useWorkspace';
import { readIncomingExport, reportNativeSync, returnToBackground } from './src/app/nativeSync';
import { currentSnapshot } from './src/core/catalogue';
import { parseSyncLink, SyncCoordinator, type SyncRequest, type SyncResult } from './src/core/sync';
import { decodeBackup, deleteAccount, emptyWorkspace, encodeBackup } from './src/core/workspace';
import { publishWidgets } from './src/widgets/publish';

const automationKey = '@cocwidget/automation-v1', resultKey = '@cocwidget/last-sync-v1', tokenKey = '@cocwidget/pairing-v1';
const makeToken = async () => Array.from(await Crypto.getRandomBytesAsync(32), byte => byte.toString(16).padStart(2, '0')).join('');
const delay = (milliseconds: number) => new Promise(resolve => setTimeout(resolve, milliseconds));
async function clipboardText() {
  // Android permits reads only after our Activity has focus. A cold launch can precede that.
  for (let attempt = 0; attempt < 8; attempt++) {
    if (AppState.currentState === 'active') {
      const text = await Clipboard.getStringAsync();
      if (text.trim()) return text;
    }
    await delay(150);
  }
  throw new Error('No clipboard text is available. Copy a village export first.');
}
export default function App() {
  return <SafeAreaProvider><WidgetSetup /></SafeAreaProvider>;
}
function WidgetSetup() {
  const store = useWorkspace();
  const [enabled, setEnabled] = useState(false), enabledRef = useRef(false);
  const tokenRef = useRef('');
  const [settingsReady, setSettingsReady] = useState(false), [last, setLast] = useState<SyncResult | null>(null);
  const [message, setMessage] = useState(''), [input, setInput] = useState(''), [busy, setBusy] = useState(false);
  const [inbox, setInbox] = useState<SyncRequest[]>([]), processing = useRef(false), published = useRef(false);
  const pendingCount = useRef(0);
  const [fixture, setFixture] = useState<number | null>(null);
  useEffect(() => {
    void Promise.all([AsyncStorage.getItem(automationKey), AsyncStorage.getItem(resultKey), AsyncStorage.getItem(tokenKey)]).then(async ([setting, previous, storedToken]) => {
      const token = storedToken && /^[a-f0-9]{64}$/.test(storedToken) ? storedToken : await makeToken();
      await AsyncStorage.setItem(tokenKey, token); tokenRef.current = token;
      const value = setting === 'true'; enabledRef.current = value; setEnabled(value);
      if (previous) { try { const result = JSON.parse(previous); if (typeof result?.completedAt === 'number' && typeof result?.widgetUpdated === 'boolean') setLast(result); } catch {} }
    }).catch(() => setMessage('Automation settings could not be read. Enable imports again to continue.'))
      .finally(() => setSettingsReady(true));
  }, []);
  const service = useMemo(() => new SyncCoordinator({
    enabled: () => enabledRef.current,
    authorize: request => !!tokenRef.current && request.token === tokenRef.current,
    commit: store.commit,
    replace: store.replace,
    publish: publishWidgets,
    clipboard: clipboardText,
    readFile: readIncomingExport,
    report: async result => {
      setLast(result);
      try { await AsyncStorage.setItem(resultKey, JSON.stringify(result)); }
      finally { await reportNativeSync(result); }
    },
  }), [store.commit, store.replace]);
  useEffect(() => {
    const receive = (link: string) => {
      try {
        if (__DEV__ && link.startsWith('cocwidget://test-export')) { setFixture(0); return; }
        const request = parseSyncLink(link);
        if (request) {
          if (pendingCount.current >= 10) {
            void reportNativeSync({ requestId: request.requestId, status: 'failed', widgetUpdated: false, completedAt: Date.now(), message: 'Import queue is full. Retry later.' }).catch(() => {});
            return;
          }
          pendingCount.current++; setFixture(null); setInbox(pending => [...pending, request]);
        }
      } catch (error) { setMessage((error as Error).message); }
    };
    void Linking.getInitialURL().then(link => { if (link) receive(link); }).catch(error => setMessage(error.message));
    const listener = Linking.addEventListener('url', event => receive(event.url));
    return () => listener.remove();
  }, []);
  useEffect(() => {
    if (!store.workspace || published.current) return;
    published.current = true;
    void service.refresh().catch(error => setMessage(error.message));
  }, [store.workspace, service]);
  useEffect(() => {
    if (!store.workspace || !settingsReady || processing.current || !inbox.length) return;
    const request = inbox[0]!;
    processing.current = true; pendingCount.current--; setBusy(true); setInbox(pending => pending.slice(1));
    void service.receive(request).then(async result => {
      if (request.background && result.widgetUpdated) await returnToBackground();
    }).catch(error => setMessage(error.message)).finally(() => {
      processing.current = false; setBusy(false); setInbox(pending => [...pending]);
    });
  }, [inbox, store.workspace, settingsReady, service]);
  const toggle = async (value: boolean) => {
    try {
      if (value && !tokenRef.current) throw new Error('Pairing settings are unavailable. Restart the app.');
      await AsyncStorage.setItem(automationKey, String(value)); enabledRef.current = value; setEnabled(value);
    }
    catch { setMessage('Could not save the automation setting.'); }
  };
  const manual = async (text?: string) => {
    setBusy(true); setMessage('');
    try {
      const result = await service.receive({ requestId: `manual-${Date.now()}`, text, clipboard: text === undefined, background: false }, true);
      if (result.widgetUpdated) setInput('');
    } catch (error) { setMessage((error as Error).message); }
    finally { setBusy(false); }
  };
  const choose = async (restore = false) => {
    try {
      const picked = await DocumentPicker.getDocumentAsync({ type: ['application/json', 'text/plain'], copyToCacheDirectory: true });
      if (picked.canceled) return;
      const asset = picked.assets[0]!;
      const limit = restore ? 20_000_000 : 1_000_000, file = new File(asset.uri);
      if ((asset.size ?? 0) > limit || file.size > limit) throw new Error('That file exceeds the supported size.');
      const text = await file.text();
      if (restore) {
        const value = decodeBackup(text);
        Alert.alert('Replace saved villages?', 'This restores the selected backup on this device.', [
          { text: 'Cancel', style: 'cancel' }, { text: 'Restore', onPress: () => {
            void service.replace(value).catch(error => setMessage(error.message));
          } },
        ]);
      } else await manual(text);
    } catch (error) { setMessage((error as Error).message); }
  };
  const backup = async () => {
    try {
      if (!store.workspace) return;
      const file = new File(Paths.cache, 'cocwidget-backup.json'); file.write(encodeBackup(store.workspace));
      if (!await Sharing.isAvailableAsync()) throw new Error('Sharing is unavailable on this device.');
      await Sharing.shareAsync(file.uri, { mimeType: 'application/json' });
    } catch (error) { setMessage((error as Error).message); }
  };
  if (!settingsReady || (!store.workspace && !store.error)) return <View style={styles.loading}><ActivityIndicator /><Text>Opening widget settings…</Text></View>;
  if (__DEV__ && fixture !== null) return <SafeAreaView style={styles.root}><View style={styles.content}>
    <Text style={styles.title}>Synthetic export source</Text><Text style={styles.body}>Development test fixture. This is not Clash of Clans.</Text>
    <Text style={styles.heading}>{['Village', 'Settings', 'More settings', 'Export copied'][fixture]}</Text>
    <Button title={['Settings', 'More settings', 'Copy data export', 'Back to village'][fixture]!} onPress={() => {
      if (fixture === 2) {
        const raw = JSON.parse(JSON.stringify(require('./tests/fixtures/village-export.json')));
        raw.tag = '#AUTOTEST'; raw.timestamp = Math.floor(Date.now() / 1000); raw.boosts = {};
        raw.heroes.find((hero: { data: number }) => hero.data === 28000000).timer = 180;
        raw.automation_fixture = true;
        void Clipboard.setStringAsync(JSON.stringify(raw)).then(() => setFixture(3));
      } else setFixture((fixture + 1) % 4);
    }} />
  </View></SafeAreaView>;
  return <SafeAreaView style={styles.root}>
    <StatusBar style="dark" />
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text accessibilityRole="header" style={styles.title}>COCWidget</Text>
      <Text style={styles.body}>Widget setup and automatic imports</Text>
      {store.error && <View style={styles.section}><Text style={styles.error}>{store.error}</Text><Button title="Restore backup" onPress={() => void choose(true)} /><Button title="Reset unreadable workspace" onPress={() => Alert.alert('Reset saved data?', 'This erases the unreadable workspace on this device.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Reset', style: 'destructive', onPress: () => void store.replace(emptyWorkspace()) }])} /></View>}
      <View style={styles.section}>
        <View style={styles.row}><View style={{ flex: 1 }}><Text style={styles.heading}>Automatic imports</Text><Text style={styles.body}>Accept JSON from your Shortcut or sync script and refresh widgets without a Save prompt.</Text></View><Switch trackColor={{ false: '#D0D0D0', true: '#101010' }} accessibilityLabel="Automatic imports" disabled={!!store.error} value={enabled} onValueChange={value => void toggle(value)} /></View>
        <Text style={styles.body}>This accepts available exports. A fresh export must still come from Clash or a configured Android export-menu script.</Text>
        <Button title="Copy automation pairing code" disabled={!enabled} onPress={() => void Clipboard.setStringAsync(tokenRef.current).then(() => setMessage('Pairing code copied. Use it in your script or Shortcut.'))} />
        <Button title="Reset automation pairing" disabled={!enabled || busy} onPress={() => Alert.alert('Reset pairing?', 'Existing scripts and Shortcuts will need the new code.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Reset', onPress: () => { void makeToken().then(async token => { await AsyncStorage.setItem(tokenKey, token); tokenRef.current = token; setMessage('Pairing reset. Copy the new code to your scripts.'); }).catch(error => setMessage(error.message)); } }])} />
        {busy && <ActivityIndicator accessibilityLabel="Syncing widget" />}
        {last && <View accessibilityLiveRegion="polite"><Text style={styles.heading}>{last.widgetUpdated ? last.status === 'updated' ? 'Widget data updated' : last.status === 'ignored_older' ? 'Older export ignored' : 'Already current · widgets refreshed' : 'Sync needs attention'}</Text><Text style={styles.body}>{last.message ?? `${last.tag} · Exported ${new Date(last.exportedAt!).toLocaleString()}`}</Text><Text style={styles.small}>Last attempt: {new Date(last.completedAt).toLocaleString()}</Text></View>}
        {!!message && <Text accessibilityRole="alert" style={styles.error}>{message}</Text>}
      </View>
      <View style={styles.section}><Text style={styles.heading}>Home-screen widget</Text><Text style={styles.body}>{Platform.OS === 'ios' ? 'Touch and hold your Home Screen, add the COCWidget widget, then edit it to choose a village.' : 'Touch and hold your Home Screen, choose Widgets → COCWidget, and select a village.'}</Text><Text style={styles.body}>Countdowns run independently. Expected completions and snapshot age remain visible; importing fresh JSON updates the village state.</Text><Button title="Refresh installed widgets" disabled={busy || !store.workspace} onPress={() => void service.refresh().then(() => setMessage('Saved snapshots republished.')).catch(error => setMessage(error.message))} /></View>
      <View style={styles.section}><Text style={styles.heading}>Saved villages</Text>
        {!store.workspace?.accounts.length && <Text style={styles.body}>No villages yet. Import once, then choose it in your widget settings.</Text>}
        {store.workspace?.accounts.map(account => <View key={account.tag} style={styles.village}><Text style={styles.heading}>{account.name}{account.demo ? ' · SAMPLE' : ''}</Text><Text style={styles.body}>{account.tag} · TH {currentSnapshot(account).townHall}</Text><Text style={styles.small}>Exported {new Date(currentSnapshot(account).exportedAt).toLocaleString()}</Text><Button title={`Remove ${account.name}`} color="#A54D3C" onPress={() => Alert.alert('Remove village?', 'Its local history will also be removed.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Remove', style: 'destructive', onPress: () => void service.update(value => deleteAccount(value, account.tag)).catch(error => setMessage(error.message)) }])} /></View>)}
      </View>
      <View style={styles.section}><Text style={styles.heading}>Manual import</Text><Text style={styles.body}>Clash → Settings → More Settings → Data Export → Copy</Text><Button title="Import clipboard now" disabled={busy || !store.workspace} onPress={() => void manual()} /><Button title="Import JSON file" disabled={busy || !store.workspace} onPress={() => void choose()} /><TextInput accessibilityLabel="Village export JSON" value={input} onChangeText={setInput} placeholder="Or paste village JSON here" multiline autoCorrect={false} autoCapitalize="none" style={styles.input} /><Button title="Import pasted JSON" disabled={busy || !input.trim() || !store.workspace} onPress={() => void manual(input)} /></View>
      <View style={styles.section}><Text style={styles.heading}>Backup</Text><Button title="Export backup" disabled={!store.workspace} onPress={() => void backup()} /><Button title="Restore backup" onPress={() => void choose(true)} /></View>
    </ScrollView>
  </SafeAreaView>;
}
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F4F4F4' }, loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  content: { padding: 22, gap: 18, paddingBottom: 48 }, title: { fontSize: 30, fontWeight: '700', color: '#101010' },
  heading: { fontSize: 16, fontWeight: '600', color: '#101010' }, body: { fontSize: 14, lineHeight: 21, color: '#606060' },
  small: { fontSize: 12, lineHeight: 18, color: '#606060' }, section: { backgroundColor: 'white', padding: 18, borderRadius: 14, gap: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 }, error: { color: '#A54D3C', fontSize: 14, lineHeight: 21 },
  input: { minHeight: 100, maxHeight: 180, borderWidth: 1, borderColor: '#D5D5D5', borderRadius: 8, padding: 12, textAlignVertical: 'top' },
  village: { borderTopWidth: 1, borderTopColor: '#E4E4E4', paddingTop: 14, gap: 6 },
});

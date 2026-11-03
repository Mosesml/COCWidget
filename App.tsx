import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { AppContext, type AppContextValue, type Page } from './src/app/context';
import { useWorkspace } from './src/app/useWorkspace';
import { currentSnapshot } from './src/core/catalogue';
import { exportFromLink } from './src/core/import';
import { recommendations, schedule } from './src/core/strategy';
import { duration } from './src/core/time';
import { widgetProjection } from './src/core/widgets';
import { publishWidgets } from './src/widgets/publish';
import { acceptSnapshot, deleteAccount, emptyWorkspace } from './src/core/workspace';
import type { Candidate, Preferences } from './src/core/types';
import { Art } from './src/ui/artwork';
import { Button, Card, Chip, Empty, ErrorNote, Icon, SectionTitle, Sheet, Wordmark, styles as common } from './src/ui/components';
import { BackupDialog, ImportDialog, InventoryDialog, MagicDialog, SettingsDialog, WidgetDialog, saveBackup } from './src/ui/dialogs';
import { Army, CostLabel, Equipment, PlanScreen, Progress, Today } from './src/ui/screens';
import { color, font } from './src/ui/theme';

const pages: { id: Page; name: string; subtitle: string }[] = [
  { id: 'today', name: 'Today', subtitle: 'A clear view of what comes next.' },
  { id: 'army', name: 'My army', subtitle: 'Build toward the way you like to play.' },
  { id: 'plan', name: 'Upgrade plan', subtitle: 'A little intention goes a long way.' },
  { id: 'equipment', name: 'Equipment', subtitle: 'Put your hard-earned ore to work.' },
  { id: 'progress', name: 'Progress', subtitle: 'Look how far your village has come.' },
];
type Dialog = 'import' | 'accounts' | 'settings' | 'widgets' | 'inventory' | 'magic' | 'backup' | null;

export default function App() {
  return <SafeAreaProvider><Application /></SafeAreaProvider>;
}
function Application() {
  const store = useWorkspace(), { workspace } = store;
  const { width } = useWindowDimensions(), insets = useSafeAreaInsets();
  const wide = width >= 1050, desktop = width >= 800;
  const [page, setPage] = useState<Page>('today'), [dialog, setDialog] = useState<Dialog>(null);
  const [initialImport, setInitialImport] = useState(''), [candidate, setCandidate] = useState<Candidate | null>(null);
  const [toast, setToast] = useState(''), [now, setNow] = useState(Date.now()), [deleting, setDeleting] = useState<string | null>(null);
  const [requestedVillage, setRequestedVillage] = useState<string | null>(null);
  const scroll = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const account = workspace?.accounts.find(a => a.tag === workspace.activeTag) ?? workspace?.accounts[0];
  const snapshot = account ? currentSnapshot(account) : null;
  const candidates = useMemo(() => snapshot && account ? recommendations(snapshot, account.preferences, now) : [], [snapshot, account, now]);
  const plan = useMemo(() => snapshot && account ? schedule(snapshot, account.preferences,
    account.preferences.queue.map(key => candidates.find(c => c.key === key)).filter((c): c is Candidate => !!c), now) : null, [snapshot, account, candidates, now]);
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 30_000); return () => clearInterval(timer); }, []);
  useEffect(() => { if (!toast) return; const timer = setTimeout(() => setToast(''), 4500); return () => clearTimeout(timer); }, [toast]);
  useEffect(() => {
    if (workspace) void publishWidgets(widgetProjection(workspace, Date.now())).catch(() => setToast('Village saved. Native widget update needs another try; reopen the app to refresh.'));
  }, [workspace]);
  useEffect(() => {
    if (!requestedVillage || !workspace) return;
    const tag = requestedVillage; setRequestedVillage(null);
    if (workspace.accounts.some(a => a.tag === tag)) void store.commit(value => ({ ...value, activeTag: tag })).catch(() => setToast('Could not open this village.'));
    else setToast('This widget’s village is no longer saved. Choose another village in widget settings.');
  }, [requestedVillage, workspace, store.commit]);
  useEffect(() => {
    const handle = (url: string) => {
      try {
        const text = exportFromLink(url); if (text) { setInitialImport(text); setDialog('import'); return; }
        const parsed = new URL(url);
        if (parsed.protocol === 'cocwidget:' && parsed.hostname === 'village') setRequestedVillage(parsed.searchParams.get('tag'));
        if (parsed.protocol === 'cocwidget:' && parsed.hostname === 'villages') setDialog('accounts');
      }
      catch (error) { setToast((error as Error).message); }
    };
    void Linking.getInitialURL().then(url => { if (url) handle(url); }).catch(() => {});
    const listener = Linking.addEventListener('url', event => handle(event.url));
    return () => listener.remove();
  }, []);
  const navigate = (next: Page) => { setPage(next); scroll.current?.scrollTo({ y: 0, animated: false }); };
  const openImport = () => { setInitialImport(''); setDialog('import'); };
  const preferences = async (patch: Partial<Preferences>) => {
    if (!account) return false;
    try { await store.preferences(account.tag, patch); return true; } catch { setToast('Could not save the change. Your previous data is intact.'); return false; }
  };
  const queue = (next: Candidate) => {
    if (!account) return;
    if (account.preferences.queue.includes(next.key)) { setToast('Already in your plan.'); return; }
    void store.commit(state => ({ ...state, accounts: state.accounts.map(a => a.tag === account.tag ? {
      ...a, preferences: { ...a.preferences, queue: [...new Set([...a.preferences.queue, next.key])] },
    } : a) })).then(() => setToast(`${next.item.name} added to your plan.`)).catch(() => setToast('Could not save your plan. Please try again.'));
  };
  const backup = () => { if (workspace) void saveBackup(workspace).then(() => setToast('Backup ready to save.')).catch(error => setToast((error as Error).message)); };
  const close = () => setDialog(null);
  const activePage = pages.find(p => p.id === page)!;
  const content = page === 'today' ? <Today /> : page === 'army' ? <Army /> : page === 'plan' ? <PlanScreen /> : page === 'equipment' ? <Equipment /> : <Progress key={account?.tag} />;
  const context: AppContextValue | null = account && snapshot && workspace && plan ? {
    workspace, account, snapshot, now, wide, candidates, plan, navigate, preferences, queue, notify: setToast,
    details: setCandidate, importVillage: openImport, settings: () => setDialog('settings'), widgets: () => setDialog('widgets'),
    inventory: () => setDialog('inventory'), magic: () => setDialog('magic'),
  } : null;

  if (!workspace && !store.error) return <View style={s.loading}><Wordmark /><ActivityIndicator color={color.green} style={{ marginTop: 24 }} /><Text style={common.caption}>Opening your village…</Text></View>;
  const shell = <View style={[s.root, { paddingTop: insets.top }]}>
    <StatusBar style="dark" />
    {desktop && <View style={s.sidebar}>
      <Wordmark />
      <Text style={s.navEyebrow}>YOUR VILLAGE COMPANION</Text>
      <View style={{ gap: 7 }}>{pages.map(p => <Pressable key={p.id} accessibilityRole="tab" accessibilityState={{ selected: page === p.id }} onPress={() => navigate(p.id)} style={({ pressed }) => [s.navItem, page === p.id && s.navActive, pressed && { backgroundColor: color.limeLight }]}><Icon name={p.id} size={19} tint={page === p.id ? color.green : color.muted} /><Text style={[s.navText, page === p.id && { color: color.green, fontWeight: '600' }]}>{p.name}</Text>{p.id === 'plan' && !!account?.preferences.queue.length && <View style={s.navCount}><Text style={{ color: color.green, fontSize: 10 }}>{account.preferences.queue.length}</Text></View>}</Pressable>)}</View>
      <View style={s.sideDivider} />
      <Pressable accessibilityRole="button" onPress={() => setDialog('inventory')} disabled={!account} style={s.navItem}><Icon name="grid" size={19} /><Text style={s.navText}>Village inventory</Text></Pressable>
      <Pressable accessibilityRole="button" onPress={() => setDialog('widgets')} disabled={!account} style={s.navItem}><Icon name="leaf" size={19} /><Text style={s.navText}>Home screen widgets</Text></Pressable>
      <View style={{ flex: 1 }} />
      <View style={s.sideNote}><View style={common.row}><Icon name="leaf" size={15} tint={color.green} /><Text style={{ color: color.green, fontSize: 11, fontWeight: '600', fontFamily: font }}>A little better, every day.</Text></View><Text style={common.caption}>Your goals. Your pace. Your village.</Text></View>
      <Pressable accessibilityRole="button" disabled={!account} onPress={() => setDialog('settings')} style={s.navItem}><Icon name="settings" size={18} /><Text style={s.navText}>Preferences & data</Text></Pressable>
    </View>}
    <View style={{ flex: 1, minWidth: 0 }}>
      <View style={[s.topbar, { paddingHorizontal: desktop ? 36 : 20 }]}>
        {desktop ? <View style={common.row}><Icon name="leaf" size={16} tint={color.green} /><Text style={s.topbarText}>A companion for the way you play</Text></View> : <Wordmark small />}
        <View style={[common.row, { gap: 9 }, !desktop && { flex: 1, minWidth: 0, justifyContent: 'flex-end' }]}>
          {account && <Pressable accessibilityRole="button" accessibilityLabel="Switch village" onPress={() => setDialog('accounts')} style={[s.accountSwitch, { flexShrink: 1, minWidth: 0, maxWidth: desktop ? 360 : undefined }]}><View style={s.accountMark}><Text style={{ color: color.green, fontWeight: '700', fontSize: 11 }}>{snapshot?.townHall}</Text></View><View style={{ gap: 2, flexShrink: 1, minWidth: 0 }}><Text numberOfLines={1} style={{ color: color.ink, fontSize: 12, fontFamily: font, fontWeight: '600' }}>{account.name}</Text>{desktop && <Text style={{ color: color.muted, fontSize: 10, fontFamily: font }}>Town Hall {snapshot?.townHall}</Text>}</View><Icon name="down" size={14} /></Pressable>}
          {!desktop && account && <Pressable accessibilityRole="button" accessibilityLabel="Preferences" onPress={() => setDialog('settings')} style={s.iconButton}><Icon name="settings" size={18} /></Pressable>}
        </View>
      </View>
      <ScrollView ref={scroll} style={{ flex: 1 }} contentContainerStyle={{ padding: desktop ? 36 : 20, paddingBottom: desktop ? 35 : 100 + insets.bottom, alignItems: 'center' }} keyboardShouldPersistTaps="handled">
        <View style={{ width: '100%', maxWidth: 1220, gap: 24 }}>
          {store.error ? <Card><ErrorNote message={store.error} /><Button onPress={() => setDialog('backup')} icon="import">Restore a backup</Button><Button tone="danger" onPress={() => setDeleting('__reset__')}>Reset local workspace</Button></Card> : context ? <>
            <View style={[s.pageHeading, !desktop && { alignItems: 'flex-start' }]}><View style={{ flex: 1, gap: 7 }}><Text style={s.date}>{new Date(now).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' }).toUpperCase()}</Text><Text accessibilityRole="header" style={s.pageTitle}>{activePage.name}<Text style={{ color: color.green }}>.</Text></Text><Text style={s.pageSubtitle}>{activePage.subtitle}</Text></View><Button onPress={openImport} icon="import" compact={!desktop}>{desktop ? 'Update village' : 'Import'}</Button></View>
            {account?.demo && <View style={[s.demoBanner, !desktop && { alignItems: 'flex-start' }]}><Chip tone="amber">Sample workspace</Chip><Text style={[common.caption, { flex: 1 }]}>You’re exploring two example villages. Import yours when you’re ready.</Text></View>}
            {content}
            <View style={[s.footer, !desktop && { flexDirection: 'column', alignItems: 'flex-start' }]}><Text style={common.caption}>Village exported {now - snapshot!.exportedAt < 60000 ? 'just now' : `${duration((now - snapshot!.exportedAt) / 1000)} ago`} · Estimates from your saved snapshot</Text><Pressable accessibilityRole="button" onPress={() => setDialog('inventory')} style={{ minHeight: 44, justifyContent: 'center' }}><Text style={[common.caption, { color: color.green }]}>Explore full inventory ↗</Text></Pressable></View>
          </> : <Card><Empty title="Your next chapter starts here" message="Copy a village export from Clash of Clans to get an upgrade plan built around your goals." action={<Button onPress={openImport} icon="import">Import your village</Button>} /><Button tone="ghost" onPress={() => setDialog('backup')}>Restore a backup</Button></Card>}
        </View>
      </ScrollView>
      {!desktop && context && <View style={[s.mobileNav, { paddingBottom: Math.max(insets.bottom, 10) }]}>{pages.map(p => <Pressable key={p.id} accessibilityRole="tab" accessibilityLabel={p.name} accessibilityState={{ selected: page === p.id }} onPress={() => navigate(p.id)} style={s.mobileTab}><Icon name={p.id} size={20} tint={page === p.id ? color.green : '#919A88'} /><Text style={{ fontFamily: font, fontSize: 10, color: page === p.id ? color.green : color.muted, fontWeight: page === p.id ? '600' : '400' }}>{p.id === 'army' ? 'Army' : p.id === 'plan' ? 'Plan' : p.name}</Text></Pressable>)}</View>}
    </View>
    {!!toast && <View pointerEvents="none" style={[s.toast, { bottom: desktop ? 25 : 95 + insets.bottom }]}><Icon name="check" size={16} tint="#DAEABC" /><Text accessibilityLiveRegion="polite" style={{ color: '#F2F6E8', fontSize: 13, lineHeight: 20, fontFamily: font, flexShrink: 1 }}>{toast}</Text></View>}
    {dialog === 'import' && workspace && <ImportDialog workspace={workspace} initial={initialImport} onClose={close} onSave={async (next, name) => {
      await store.commit(value => acceptSnapshot(value, next, name)); navigate('today'); setToast('Village saved. Your new snapshot is ready.');
    }} />}
    {dialog === 'backup' && <BackupDialog onClose={close} replace={async value => { await store.replace(value); navigate('today'); setToast('Backup restored.'); }} />}
    {dialog === 'accounts' && workspace && <Sheet title="Your villages" subtitle="Each village keeps its own goals, inventory and history." onClose={close}>
      {workspace.accounts.map(a => <View key={a.tag} style={[common.row, { paddingVertical: 8 }]}><Pressable accessibilityRole="button" accessibilityLabel={`Switch to ${a.name}`} onPress={() => void store.commit(value => ({ ...value, activeTag: a.tag })).then(close).catch(() => setToast('Could not switch villages.'))} style={[common.row, { flex: 1 }]}><Art icon="today" size={42} /><View style={{ flex: 1, gap: 5 }}><Text style={[common.body, { fontWeight: '600' }]}>{a.name}</Text><Text style={common.caption}>TH {currentSnapshot(a).townHall} · {a.demo ? 'Sample' : a.tag}</Text></View>{a.tag === account?.tag && <Icon name="check" tint={color.green} />}</Pressable><Pressable accessibilityRole="button" accessibilityLabel={`Delete ${a.name}`} onPress={() => setDeleting(a.tag)} style={s.iconButton}><Icon name="trash" tint={color.muted} size={17} /></Pressable></View>)}
      <Button onPress={openImport} icon="plus">Add a village</Button><Button tone="ghost" onPress={backup} icon="share">Export all villages</Button>
    </Sheet>}
    {context && dialog === 'settings' && <SettingsDialog key={context.account.tag} onClose={close} backup={backup} restore={() => setDialog('backup')} rename={name => store.commit(value => ({ ...value, accounts: value.accounts.map(a => a.tag === context.account.tag ? { ...a, name: name.trim().slice(0, 60) || a.tag } : a) }))} />}
    {context && dialog === 'inventory' && <InventoryDialog onClose={close} />}
    {context && dialog === 'magic' && <MagicDialog onClose={close} />}
    {context && dialog === 'widgets' && <WidgetDialog onClose={close} />}
    {candidate && context && <Sheet title={candidate.item.name} subtitle={`Level ${candidate.from} → ${candidate.to}`} onClose={() => setCandidate(null)}>
      <View style={common.row}><Art id={candidate.item.id} size={68} /><View style={{ flex: 1, gap: 7 }}><Chip>{duration(candidate.seconds)} estimated</Chip><CostLabel cost={candidate.cost} /></View></View>
      <Text style={common.body}>{candidate.item.description}</Text><SectionTitle title="Why this is on your list" />{candidate.reasons.map(reason => <View key={reason} style={common.row}><Icon name="check" tint={color.green} size={16} /><Text style={[common.body, { flex: 1 }]}>{reason}</Text></View>)}
      {!!candidate.blockers.length && <ErrorNote message={`Needs ${candidate.blockers.join(', ')}. Add the prerequisite upgrades first; unsupported work will be deferred.`} />}
      <Text style={common.caption}>Costs and durations use the pinned catalogue and your future discount setting. This recommendation does not start an upgrade in-game.</Text><Button onPress={() => { queue(candidate); setCandidate(null); }} icon="plus">Add to my plan</Button>
    </Sheet>}
    {deleting && <Sheet title={deleting === '__reset__' ? 'Reset this device?' : 'Remove this village?'} subtitle="This changes only the data stored on this device." onClose={() => setDeleting(null)}><Text style={common.body}>{deleting === '__reset__' ? 'This will replace the unreadable saved workspace with an empty one. Keep an exported backup if you need the old data.' : 'The village, snapshots and preferences will be removed. Export a backup first if you want to keep them.'}</Text><Button tone="danger" onPress={() => {
      const job = deleting === '__reset__' ? store.replace(emptyWorkspace()) : store.commit(value => deleteAccount(value, deleting));
      void job.then(() => { setDeleting(null); setDialog(null); setToast('Local data updated.'); }).catch(() => setToast('Could not remove local data.'));
    }}>{deleting === '__reset__' ? 'Reset local workspace' : 'Remove village from this device'}</Button></Sheet>}
  </View>;
  return context ? <AppContext.Provider value={context}>{shell}</AppContext.Provider> : shell;
}

const s = StyleSheet.create({
  root: { flex: 1, flexDirection: 'row', backgroundColor: color.canvas },
  loading: { flex: 1, backgroundColor: color.canvas, alignItems: 'center', justifyContent: 'center', gap: 20 },
  sidebar: { width: 225, backgroundColor: color.paper, paddingHorizontal: 20, paddingTop: 31, paddingBottom: 18, borderRightWidth: 1, borderRightColor: color.line },
  navEyebrow: { color: color.muted, fontSize: 10, fontWeight: '600', letterSpacing: 1.3, marginTop: 36, marginBottom: 18, paddingHorizontal: 12, fontFamily: font },
  navItem: { minHeight: 46, paddingHorizontal: 13, paddingVertical: 12, borderRadius: 10, flexDirection: 'row', alignItems: 'center', gap: 12 },
  navActive: { backgroundColor: color.limeLight }, navText: { fontFamily: font, color: color.muted, fontSize: 12 },
  navCount: { marginLeft: 'auto', minWidth: 20, height: 20, backgroundColor: '#DFEACF', borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  sideDivider: { height: 1, backgroundColor: color.line, marginVertical: 21 },
  sideNote: { backgroundColor: '#F5F7EE', borderRadius: 12, padding: 14, gap: 9, marginVertical: 20 },
  topbar: { minHeight: 81, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, backgroundColor: '#FDFEF9', borderBottomWidth: 1, borderBottomColor: color.line },
  topbarText: { color: color.muted, fontFamily: font, fontSize: 11 },
  accountSwitch: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 7 },
  accountMark: { width: 35, height: 35, borderRadius: 11, backgroundColor: color.limeLight, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#DCE7CD' },
  iconButton: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 12 },
  pageHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 15 },
  date: { fontFamily: font, color: color.muted, fontSize: 10, letterSpacing: 1.3, fontWeight: '500' },
  pageTitle: { fontFamily: font, color: color.ink, fontSize: 35, fontWeight: '600', letterSpacing: -1.6 },
  pageSubtitle: { fontFamily: font, color: color.muted, fontSize: 12, lineHeight: 21 },
  demoBanner: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#F4F3E9', borderWidth: 1, borderColor: '#E9E6D7', padding: 12, borderRadius: 12 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 4, gap: 12 },
  mobileNav: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: color.line, backgroundColor: color.paper, paddingTop: 10 },
  mobileTab: { flex: 1, minHeight: 45, gap: 6, alignItems: 'center', justifyContent: 'center' },
  toast: { position: 'absolute', alignSelf: 'center', left: '10%', right: '10%', maxWidth: 580, marginHorizontal: 'auto', backgroundColor: color.forest, paddingHorizontal: 19, paddingVertical: 13, borderRadius: 13, flexDirection: 'row', alignItems: 'center', gap: 10 },
});

import React, { useState } from 'react';
import { Pressable, ScrollView, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useApp } from '../app/context';
import { hallCap, levelAt, lookup } from '../core/catalogue';
import { compareSnapshots, progressReport } from '../core/history';
import { armies, armyFor, armyReadiness, equipmentRows, nextBreakpoint, oreKeys } from '../core/strategy';
import { compact, duration, running } from '../core/time';
import type { Candidate, Lane } from '../core/types';
import { Art } from './artwork';
import { Button, Card, Chip, Empty, Field, Icon, Meter, SectionTitle, styles as common } from './components';
import { color, font } from './theme';

export const laneNames: Record<Lane, string> = { builder: 'Builders', lab: 'Laboratory', pet: 'Pet House', builderBase: 'Builder Base', starLab: 'Star Laboratory' };
const dateTime = (time: number) => new Date(time).toLocaleString(undefined, { weekday: 'short', hour: 'numeric', minute: '2-digit' });
export function CostLabel({ cost }: { cost: Record<string, number> }) {
  return <Text style={common.caption}>{Object.entries(cost).filter(([, value]) => value > 0).map(([key, value]) => `${compact(value)} ${key.replaceAll('_', ' ')}`).join(' · ') || 'No resource cost'}</Text>;
}
function CandidateRow({ candidate, compact: small = false }: { candidate: Candidate; compact?: boolean }) {
  const app = useApp(), queued = app.account.preferences.queue.includes(candidate.key);
  return <View style={s.candidate}>
    <Art id={candidate.item.id} size={small ? 40 : 46} />
    <Pressable accessibilityRole="button" accessibilityLabel={`Why upgrade ${candidate.item.name}`} onPress={() => app.details(candidate)} style={{ flex: 1, gap: 4 }}>
      <Text style={s.rowName}>{candidate.item.name}</Text>
      <Text style={common.caption}>Level {candidate.from} → {candidate.to} <Text style={{ color: color.green }}>· {duration(candidate.seconds)}</Text></Text>
      {!small && <CostLabel cost={candidate.cost} />}
      {!!candidate.blockers.length && <Text style={[common.caption, { color: '#926E34' }]}>Needs {candidate.blockers.join(', ')}</Text>}
    </Pressable>
    <Pressable accessibilityRole="button" accessibilityLabel={queued ? `${candidate.item.name} queued` : `Queue ${candidate.item.name}`} disabled={queued} onPress={() => app.queue(candidate)} style={[s.add, queued && { backgroundColor: color.limeLight }]}>
      <Icon name={queued ? 'check' : 'plus'} size={17} tint={color.green} />
    </Pressable>
  </View>;
}
function Stat({ icon, label, value, hint }: { icon: 'builder' | 'clock' | 'army'; label: string; value: string; hint: string }) {
  return <View style={s.stat}><View style={common.row}><Icon name={icon} size={17} /><Text style={s.statLabel}>{label}</Text></View><Text style={s.statValue}>{value}</Text><Text style={common.caption}>{hint}</Text></View>;
}
export function Today() {
  const app = useApp(), { snapshot, account, now, candidates, wide } = app;
  const timers = running(snapshot, now), active = timers.filter(timer => !timer.ready), upcoming = active.slice(0, 4);
  const busy = active.filter(row => row.lane === 'builder' && !row.entity.extra).length;
  const next = active.find(row => row.lane === 'builder' && !row.entity.extra);
  const best = candidates.find(candidate => !candidate.blockers.length) ?? candidates[0];
  const readiness = armyReadiness(snapshot, account.preferences), measured = readiness.filter(r => r.progress !== null);
  const readinessScore = measured.length ? measured.reduce((sum, r) => sum + r.progress!, 0) / measured.length : 0;
  const history = account.snapshots.length > 1 ? compareSnapshots(account.snapshots[0]!, snapshot) : null;
  const wallGain = history?.changes.find(c => c.id === 1000010)?.levelsGained ?? 0;
  return <View style={s.screen}>
    <View style={[s.hero, wide && { minHeight: 235 }]}>
      <View style={{ flex: 1, gap: 14, zIndex: 1 }}>
        <View style={common.row}><View style={s.heroDot} /><Text style={s.heroEyebrow}>YOUR NEXT MOVE</Text></View>
        <Text style={s.heroTitle}>{best ? `A stronger village starts with ${best.item.name}.` : 'A little planning. A stronger village.'}</Text>
        <Text style={s.heroCopy}>{best ? `${best.reasons[0]}. Level ${best.from} → ${best.to}, in ${duration(best.seconds)}.` : 'Import a fresh village snapshot to see your next useful upgrade.'}</Text>
        <View style={[common.row, { flexWrap: 'wrap', paddingTop: 6 }]}>
          {best ? <Pressable accessibilityRole="button" onPress={() => app.queue(best)} style={s.heroButton}><Text style={s.heroButtonText}>{account.preferences.queue.includes(best.key) ? 'Added to your plan' : 'Add to my plan'}</Text><Icon name={account.preferences.queue.includes(best.key) ? 'check' : 'arrow'} size={17} tint={color.forest} /></Pressable> : <Button onPress={app.importVillage} icon="import">Import village</Button>}
          {best && <Pressable accessibilityRole="button" onPress={() => app.details(best)} style={{ minHeight: 44, justifyContent: 'center' }}><Text style={{ color: '#D4DDCC', fontSize: 12, fontFamily: font }}>Why this upgrade? ↗</Text></Pressable>}
        </View>
      </View>
      {wide && <View style={s.heroArtwork}><View style={s.heroCircle}><Art id={best?.item.id ?? 4000008} size={134} icon="sparkle" plain /></View><View style={s.heroTag}><Icon name="leaf" size={14} tint="#D8E9BC" /><Text style={{ color: '#D8E9BC', fontSize: 11 }}>A little better, every day</Text></View></View>}
    </View>
    <View style={[s.stats, !wide && { gap: 0 }]}>
      <Stat icon="builder" label="Builders at work" value={`${Math.min(busy, account.preferences.builders)} / ${account.preferences.builders}`} hint={busy < account.preferences.builders ? 'A builder may be available' : 'Steady progress, all day'} />
      <Stat icon="clock" label="Next builder free" value={next ? duration((next.end - now) / 1000) : 'Ready'} hint={next ? next.entity.name : 'Based on your last snapshot'} />
      <Stat icon="army" label="Army level progress" value={`${Math.round(readinessScore * 100)}%`} hint={`${measured.length} known targets · ${armyFor(account.preferences.armyId).shortName}`} />
    </View>
    <View style={[s.columns, !wide && { flexDirection: 'column' }]}>
      <Card style={{ flex: wide ? 1.3 : undefined }}>
        <SectionTitle title="Coming up next" subtitle="Estimated from your saved village" action={<Button tone="ghost" compact onPress={() => app.navigate('plan')}>View plan →</Button>} />
        {upcoming.length ? upcoming.map((row, index) => <View key={row.entity.key} style={[s.completion, index > 0 && s.divider]}>
          <Art id={row.entity.id} size={42} icon={row.lane === 'lab' ? 'book' : 'builder'} />
          <View style={{ flex: 1, gap: 4 }}><Text style={s.rowName}>{row.entity.name}</Text><Text style={common.caption}>{laneNames[row.lane ?? 'builder']} · {row.entity.supercharge !== undefined ? `Supercharge ${row.entity.supercharge + 1}` : `Level ${(row.entity.level ?? 0) + 1}`}</Text></View>
          <View style={{ alignItems: 'flex-end', gap: 5 }}><Text style={s.timer}>{duration((row.end - now) / 1000)}</Text><Text style={[common.caption, { fontSize: 11 }]}>{dateTime(row.end)}</Text></View>
        </View>) : <Empty title="Nothing running here" message="Import after starting an upgrade. A passed timer stays an estimate until your next snapshot." icon="clock" />}
        {!!timers.filter(t => t.ready).length && <Text style={common.caption}>{timers.filter(t => t.ready).length} upgrades are expected ready. A fresh import confirms the new levels.</Text>}
      </Card>
      <View style={{ flex: wide ? 1 : undefined, gap: 20 }}>
        <Card><SectionTitle title="A goal worth building for" action={<Icon name="army" tint={color.green} />} />
          <View style={common.row}><Art id={4000008} size={52} icon="army" /><View style={{ flex: 1, gap: 4 }}><Text style={s.rowName}>{armyFor(account.preferences.armyId).name}</Text><Text style={common.caption}>Your selected army goal</Text></View></View>
          <Meter value={readinessScore} /><Text style={common.caption}>Level progress toward current-Hall targets. Battle results depend on your strategy and execution.</Text>
          <Button tone="secondary" onPress={() => app.navigate('army')}>Build my army →</Button>
        </Card>
        <Pressable accessibilityRole="button" onPress={() => app.navigate('progress')} style={s.progressNote}>
          <View style={{ gap: 8, flex: 1 }}><Text style={s.noteEyebrow}>SMALL WINS ADD UP</Text><Text style={s.noteTitle}>{wallGain > 0 ? `${wallGain} wall levels. That’s progress.` : 'Every upgrade moves you forward.'}</Text><Text style={common.caption}>{history ? 'Since your first saved snapshot' : 'Your next import starts your history'} ↗</Text></View><Icon name="progress" size={42} tint="#8EAA72" />
        </Pressable>
      </View>
    </View>
    <Card><SectionTitle title="Next on your shortlist" subtitle="A useful upgrade, with a reason behind it" action={<Button tone="ghost" compact onPress={() => app.navigate('army')}>See all →</Button>} />
      <View style={[s.columns, !wide && { flexDirection: 'column', gap: 0 }]}>{candidates.slice(0, wide ? 3 : 2).map(candidate => <View key={candidate.key} style={{ flex: 1 }}><CandidateRow candidate={candidate} compact /></View>)}</View>
    </Card>
    <View style={[s.utilityRow, !wide && { flexDirection: 'column' }]}>
      <Pressable accessibilityRole="button" onPress={app.widgets} style={s.utility}><Icon name="grid" tint={color.green} /><View style={{ flex: 1, gap: 4 }}><Text style={s.rowName}>Your village, at a glance</Text><Text style={common.caption}>Bring your next move to your home screen.</Text></View><Icon name="arrow" size={17} /></Pressable>
      <Pressable accessibilityRole="button" onPress={app.magic} style={s.utility}><Icon name="sparkle" tint={color.purple} /><View style={{ flex: 1, gap: 4 }}><Text style={s.rowName}>Make your magic items count</Text><Text style={common.caption}>Compare time saved before you use one.</Text></View><Icon name="arrow" size={17} /></Pressable>
    </View>
  </View>;
}

export function Army() {
  const app = useApp(), { account, snapshot, candidates, wide } = app, preferences = account.preferences;
  const readiness = armyReadiness(snapshot, preferences);
  return <View style={s.screen}>
    <View style={[s.columns, !wide && { flexDirection: 'column' }]}>{armies.map(army => <Pressable accessibilityRole="button" accessibilityState={{ selected: preferences.armyId === army.id }} key={army.id} onPress={() => void app.preferences({ armyId: army.id })} style={[s.armyChoice, preferences.armyId === army.id && { borderColor: color.green, backgroundColor: color.limeLight }]}><View style={[common.row, { justifyContent: 'space-between' }]}><Icon name="army" tint={color.green} />{preferences.armyId === army.id && <Icon name="check" size={17} tint={color.green} />}</View><Text style={s.sectionHeadline}>{army.name}</Text><Text style={common.caption}>{army.description}</Text></Pressable>)}</View>
    <Card><SectionTitle title="What are you building toward?" subtitle="Choose how recommendations are prioritized." />
      <View style={[common.row, { flexWrap: 'wrap' }]}>{([['army', 'Improve my army'], ['max', 'Max this Town Hall'], ['war', 'Prepare for war']] as const).map(([goal, label]) => <Button key={goal} tone={preferences.goal === goal ? 'primary' : 'secondary'} onPress={() => void app.preferences({ goal })}>{label}</Button>)}</View>
      {preferences.goal === 'war' && <View style={[common.row, { alignItems: 'flex-end', flexWrap: 'wrap' }]}><Field label="War deadline (YYYY-MM-DD)" value={preferences.warDate} onChange={value => void app.preferences({ warDate: value })} placeholder="2026-12-01" /><Button tone={preferences.protectHeroes ? 'primary' : 'secondary'} onPress={() => void app.preferences({ protectHeroes: !preferences.protectHeroes })}>{preferences.protectHeroes ? 'Heroes protected' : 'Protect heroes'}</Button></View>}
    </Card>
    <Card><SectionTitle title="Your army, piece by piece" subtitle="Current levels compared with catalogue targets for your Town Hall." />
      <View style={s.readinessGrid}>{readiness.map(row => <View key={row.name} style={[s.readinessItem, { width: wide ? '31%' : '100%' }]}><Art id={row.item?.id} size={40} icon="army" /><View style={{ flex: 1, gap: 6 }}><Text style={s.rowName}>{row.name}</Text><Text style={common.caption}>{row.current === null ? 'Not present in this snapshot' : `Level ${row.current} / ${row.target} target`}</Text><Meter value={row.progress ?? 0} /></View></View>)}</View>
      <Text style={common.caption}>These army templates are editorial starting points. Missing inventory is unknown, and the percentages describe level progress rather than combat strength.</Text>
    </Card>
    <Card><SectionTitle title="Your upgrade priorities" subtitle="Tap an upgrade for the reasoning and requirements." />
      {candidates.length ? candidates.slice(0, 20).map(candidate => <CandidateRow key={candidate.key} candidate={candidate} />) : <Empty title="Your known targets are covered" message="Import a complete fresh export, or choose another goal to see more opportunities." />}
    </Card>
  </View>;
}

export function PlanScreen() {
  const app = useApp(), { account, candidates, plan, now, wide } = app, preferences = account.preferences;
  const queued = preferences.queue.map(key => candidates.find(candidate => candidate.key === key)).filter((c): c is Candidate => !!c);
  const reorder = (index: number) => {
    if (index < 1) return;
    const queue = [...preferences.queue]; [queue[index - 1], queue[index]] = [queue[index]!, queue[index - 1]!];
    void app.preferences({ queue });
  };
  return <View style={s.screen}>
    <Card><SectionTitle title="A plan that fits your day" subtitle="Future upgrades start when you can play. Existing timers keep running." action={<Button tone="ghost" onPress={app.settings} icon="settings">Assumptions</Button>} />
      <View style={[common.row, { flexWrap: 'wrap', gap: 10 }]}><Chip>{preferences.builders} home builders</Chip><Chip tone="gray">Online {String(preferences.onlineStart).padStart(2, '0')}:00–{String(preferences.onlineEnd).padStart(2, '0')}:00</Chip><Chip tone="amber">{preferences.discount}% future discount</Chip>{preferences.warDate && <Chip tone="purple">Heroes ready by {preferences.warDate}</Chip>}</View>
      <Text style={common.caption}>Resource availability is assumed. Check in-game balances and storage capacity before starting an upgrade.</Text>
    </Card>
    <View style={[s.columns, !wide && { flexDirection: 'column' }]}>
      <Card style={{ flex: 1 }}><SectionTitle title="Your queue" subtitle={`${queued.length} selected upgrades`} action={queued.length ? <Button compact tone="ghost" onPress={() => void app.preferences({ queue: [] })}>Clear</Button> : undefined} />
        {queued.length ? queued.map((candidate, index) => <View key={candidate.key} style={s.queueRow}><View style={s.queueNumber}><Text style={common.caption}>{String(index + 1).padStart(2, '0')}</Text></View><View style={{ flex: 1, gap: 4 }}><Text style={s.rowName}>{candidate.item.name}</Text><CostLabel cost={candidate.cost} /></View><Pressable accessibilityRole="button" accessibilityLabel={`Move ${candidate.item.name} earlier`} disabled={!index} onPress={() => reorder(index)} style={s.add}><Text style={{ color: index ? color.green : color.line }}>↑</Text></Pressable><Pressable accessibilityRole="button" accessibilityLabel={`Remove ${candidate.item.name} from plan`} style={s.add} onPress={() => void app.preferences({ queue: preferences.queue.filter(key => key !== candidate.key) })}><Icon name="close" size={15} /></Pressable></View>) : <Empty title="Make room for your next move" message="Choose a few recommended upgrades. We’ll fit them around your running work and play hours." action={<Button onPress={() => app.navigate('army')} icon="plus">Choose upgrades</Button>} />}
        {!!queued.length && <View style={{ backgroundColor: color.canvas, padding: 14, borderRadius: 12, gap: 5 }}><Text style={s.fieldEyebrow}>QUEUED RESOURCE COST</Text><CostLabel cost={plan.costs} /><Text style={common.caption}>Includes scheduled future work. Deferred work is listed separately.</Text></View>}
      </Card>
      <Card style={{ flex: 1.3 }}><SectionTitle title="Your timeline" subtitle="Separate lanes keep parallel work parallel." />
        {plan.steps.length ? plan.steps.map(step => <View key={step.key} style={s.timelineRow}>
          <View style={{ alignItems: 'center', paddingTop: 5 }}><View style={[s.timelineDot, { backgroundColor: step.existing ? color.line : color.green }]} /><View style={s.timelineLine} /></View>
          <View style={{ flex: 1, gap: 5, paddingBottom: 16 }}><View style={[common.row, { flexWrap: 'wrap', justifyContent: 'space-between' }]}><Text style={s.rowName}>{step.name}</Text><Chip tone={step.existing ? 'gray' : 'green'}>{step.existing ? 'Running' : 'Planned'}</Chip></View><Text style={common.caption}>{laneNames[step.lane]} {step.worker >= 0 && ['builder', 'builderBase'].includes(step.lane) ? `· Worker ${step.worker + 1}` : ''} · Level {step.to}</Text><Text style={s.timelineDate}>{step.existing ? 'Expected finish' : dateTime(step.start)} → {dateTime(step.end)}</Text>{!step.existing && <Text style={common.caption}>{duration((step.end - step.start) / 1000)} · Starts in {duration(Math.max(0, (step.start - now) / 1000))}</Text>}</View>
        </View>) : <Text style={common.caption}>Your selected and running upgrades will appear here.</Text>}
        {plan.deferred.map((step, index) => <View key={`${step.name}:${index}`} style={{ padding: 12, backgroundColor: color.amberLight, borderRadius: 10, gap: 4 }}><Text style={s.rowName}>{step.name} · Deferred</Text><Text style={common.caption}>{step.reason}</Text></View>)}
      </Card>
    </View>
    <Card><SectionTitle title="Keep the plan moving" subtitle="Add an upgrade without losing sight of the bigger picture." />{candidates.filter(candidate => !preferences.queue.includes(candidate.key)).slice(0, 5).map(candidate => <CandidateRow key={candidate.key} candidate={candidate} compact />)}</Card>
  </View>;
}

export function Equipment() {
  const app = useApp(), { account, snapshot, wide } = app, preferences = account.preferences;
  const rows = equipmentRows(snapshot, preferences);
  const updateBalance = (key: typeof oreKeys[number], value: string) => {
    if (!/^\d*$/.test(value)) return;
    const amount = Math.min(10_000_000, Number(value));
    void app.preferences({ ore: { ...preferences.ore, [key]: amount } });
  };
  return <View style={s.screen}>
    <Card><SectionTitle title="Spend ore with a purpose" subtitle="Enter your balances to see the gap to each equipment target." />
      <View style={[common.row, { flexWrap: 'wrap', alignItems: 'flex-start' }]}>{oreKeys.map((key, index) => <View key={key} style={{ flex: 1, minWidth: 130, backgroundColor: [color.limeLight, color.purpleLight, color.amberLight][index], borderRadius: 14, padding: 16, gap: 10 }}><Text style={s.fieldEyebrow}>{['SHINY ORE', 'GLOWY ORE', 'STARRY ORE'][index]}</Text><TextInput accessibilityLabel={`${key.replace('_', ' ')} balance`} value={String(preferences.ore[key])} onChangeText={value => updateBalance(key, value)} keyboardType="number-pad" style={{ fontFamily: font, color: color.ink, fontSize: 26, fontWeight: '600', fontVariant: ['tabular-nums'], padding: 0, minHeight: 40 }} /><Text style={common.caption}>Manually entered</Text></View>)}</View>
    </Card>
    {!snapshot.sections.includes('equipment') ? <Card><Empty title="Equipment data wasn’t included" message="Import a fresh in-game export that includes equipment. An omitted section does not mean you own none." action={<Button onPress={app.importVillage}>Import village</Button>} /></Card> : <View style={s.equipmentGrid}>
      {rows.map(row => <Card key={row.entity.key} style={{ width: wide ? '48.8%' : '100%' }}>
        <View style={common.row}><Art id={row.entity.id} size={50} icon="equipment" /><View style={{ flex: 1, gap: 5 }}><Text style={s.sectionHeadline}>{row.item.name}</Text><Text style={common.caption}>{row.item.hero} · {row.item.rarity}</Text></View>{row.onArmy && <Chip>Army goal</Chip>}</View>
        <View style={[common.row, { justifyContent: 'space-between' }]}><Text style={common.caption}>Level {row.entity.level} → <Text style={{ color: color.ink, fontWeight: '600' }}>{row.target}</Text> target</Text><View style={common.row}><Pressable accessibilityRole="button" accessibilityLabel={`Lower ${row.item.name} target`} disabled={row.target <= row.entity.level!} onPress={() => void app.preferences({ equipmentTargets: { ...preferences.equipmentTargets, [row.entity.id]: row.target - 1 } })} style={s.add}><Text style={{ color: color.green }}>−</Text></Pressable><Text style={s.target}>{row.target}</Text><Pressable accessibilityRole="button" accessibilityLabel={`Raise ${row.item.name} target`} disabled={row.target >= row.cap} onPress={() => void app.preferences({ equipmentTargets: { ...preferences.equipmentTargets, [row.entity.id]: row.target + 1 } })} style={s.add}><Icon name="plus" size={16} tint={color.green} /></Pressable></View></View>
        <Meter value={row.cap ? row.entity.level! / row.cap : 1} />
        <View style={{ flexDirection: 'row', gap: 12 }}>{oreKeys.map((ore, index) => <View key={ore} style={{ flex: 1, gap: 6 }}><Text style={[common.caption, { fontSize: 10, letterSpacing: 0.5 }]}>{['SHINY', 'GLOWY', 'STARRY'][index]}</Text><Text style={s.oreValue}>{compact(row.cost[ore] ?? 0)}</Text><Text style={[common.caption, { color: row.deficits[ore]! > 0 ? '#9E7040' : color.green, fontSize: 11 }]}>{row.deficits[ore]! > 0 ? `${compact(row.deficits[ore]!)} short` : 'Covered'}</Text></View>)}</View>
        <View style={{ borderTopWidth: 1, borderTopColor: color.line, paddingTop: 12, gap: 5 }}>
          <Text style={common.caption}>Next ability change: level {nextBreakpoint(row.item, row.entity.level!, row.cap)} · Hall target {row.cap}</Text>
          <Text style={common.caption}>{levelAt(row.item, row.target)?.abilities.map(ability => `${ability.name ?? 'Ability'}${ability.TroopCount ? ` · ${ability.TroopCount} troops` : ''}${ability.Damage ? ` · ${ability.Damage} damage` : ''}`).join(' / ') || row.item.description}</Text>
        </View>
      </Card>)}
    </View>}
    <Text style={common.caption}>Each card compares its target with your full balance independently. These are alternative spending choices, not a claim that all targets are affordable together. Prices come from the pinned catalogue.</Text>
  </View>;
}

export function Progress() {
  const app = useApp(), { account, snapshot, wide } = app;
  const [baselineId, setBaselineId] = useState(account.snapshots[0]?.id);
  const before = account.snapshots.find(s => s.id === baselineId) ?? account.snapshots[0]!;
  const report = account.snapshots.length > 1 ? compareSnapshots(before, snapshot) : null;
  const walls = snapshot.entities.filter(e => e.id === 1000010);
  const wallCount = walls.reduce((sum, e) => sum + e.count, 0), maxWall = hallCap(lookup(1000010)!, snapshot.townHall);
  const maxedWalls = walls.filter(e => e.level !== null && e.level >= maxWall).reduce((sum, e) => sum + e.count, 0);
  const share = async () => {
    const text = progressReport(account.name, before, snapshot);
    try { await Share.share({ message: text }); } catch { await Clipboard.setStringAsync(text); app.notify('Progress report copied.'); }
  };
  return <View style={s.screen}>
    <View style={[s.columns, !wide && { flexDirection: 'column' }]}>
      <Card style={{ flex: 1 }}><Text style={s.fieldEyebrow}>YOUR WALLS</Text><Text style={s.bigNumber}>{maxedWalls}<Text style={{ color: '#A0AA94', fontSize: 22 }}> / {wallCount}</Text></Text><Text style={common.caption}>At level {maxWall}, the catalogue target for this Hall</Text><Meter value={wallCount ? maxedWalls / wallCount : 0} />
        <View style={[common.row, { flexWrap: 'wrap' }]}>{walls.map(wall => <Chip key={wall.key} tone={wall.level === maxWall ? 'green' : 'gray'}>{wall.count} × Lv {wall.level}</Chip>)}</View>
      </Card>
      <Card style={{ flex: 1, backgroundColor: color.limeLight }}><Icon name="progress" size={26} tint={color.green} /><Text style={s.bigNumber}>{report?.changes.reduce((sum, c) => sum + Math.max(0, c.levelsGained), 0) ?? 0}</Text><Text style={s.sectionHeadline}>Observed levels gained</Text><Text style={common.caption}>Across common inventory sections since your selected snapshot. This counts levels, rather than claiming a percentage of total building time.</Text></Card>
      <Card style={{ flex: 1 }}><Icon name="book" size={26} tint={color.purple} /><Text style={s.bigNumber}>{account.snapshots.length}</Text><Text style={s.sectionHeadline}>Saved snapshots</Text><Text style={common.caption}>Every accepted export adds a point to your village’s story.</Text><Button tone="secondary" onPress={app.importVillage} icon="import">Update village</Button></Card>
    </View>
    <Card><SectionTitle title="Your progress, observed" subtitle={report ? `${new Date(before.exportedAt).toLocaleDateString()} → ${new Date(snapshot.exportedAt).toLocaleDateString()}` : 'Import again to start comparing snapshots.'} action={report ? <Button tone="secondary" compact onPress={() => void share()} icon="share">Share report</Button> : undefined} />
      {account.snapshots.length > 2 && <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>{account.snapshots.slice(0, -1).map(snap => <Button key={snap.id} tone={before.id === snap.id ? 'primary' : 'secondary'} compact onPress={() => setBaselineId(snap.id)}>{new Date(snap.exportedAt).toLocaleDateString()}</Button>)}</ScrollView>}
      {report ? report.changes.length ? report.changes.map(change => <View key={`${change.section}:${change.id}`} style={s.candidate}><Art id={change.id} size={42} icon="progress" /><View style={{ flex: 1, gap: 5 }}><Text style={s.rowName}>{change.name}</Text><Text style={common.caption}>{Object.entries(change.before).map(([level, count]) => `${count} × Lv ${level}`).join(', ')} → {Object.entries(change.after).map(([level, count]) => `${count} × Lv ${level}`).join(', ')}</Text></View><Chip>{change.levelsGained > 0 ? `+${change.levelsGained} levels` : 'Changed'}</Chip></View>) : <Empty title="No level changes observed" message="The compared sections have the same levels. Running timers can change without a completed level appearing yet." /> : <Empty title="The start of your village’s story" message="Your first snapshot is a baseline. Import again after making progress to see exactly what changed." />}
      {!!report?.skippedSections.length && <Text style={common.caption}>Not compared: {report.skippedSections.join(', ')}. Those sections were absent from one snapshot.</Text>}
    </Card>
    <Card><SectionTitle title="Snapshot history" />{[...account.snapshots].reverse().map((snap, index) => <View key={snap.id} style={[common.row, { paddingVertical: 11 }]}><View style={s.queueNumber}><Icon name={index === 0 ? 'check' : 'clock'} size={16} tint={color.green} /></View><View style={{ flex: 1, gap: 4 }}><Text style={s.rowName}>{new Date(snap.exportedAt).toLocaleString()}</Text><Text style={common.caption}>Town Hall {snap.townHall} · {snap.entities.length} inventory records</Text></View><Chip tone={index === 0 ? 'green' : 'gray'}>{index === 0 ? 'Latest' : 'Saved'}</Chip></View>)}</Card>
  </View>;
}

const s = StyleSheet.create({
  screen: { gap: 22 }, columns: { flexDirection: 'row', gap: 22, alignItems: 'stretch' },
  hero: { backgroundColor: color.forest, borderRadius: 22, padding: 30, flexDirection: 'row', gap: 20, overflow: 'hidden' },
  heroDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#C7DE98' },
  heroEyebrow: { color: '#C4D5B6', fontSize: 10, letterSpacing: 2, fontFamily: font, fontWeight: '600' },
  heroTitle: { color: '#F4F7E9', fontSize: 32, lineHeight: 40, fontWeight: '600', fontFamily: font, letterSpacing: -1.2 },
  heroCopy: { color: '#C1CEB8', fontFamily: font, fontSize: 12, lineHeight: 21 },
  heroButton: { backgroundColor: '#E0EDC5', minHeight: 44, paddingHorizontal: 18, paddingVertical: 11, borderRadius: 9, flexDirection: 'row', alignItems: 'center', gap: 14 },
  heroButtonText: { color: color.forest, fontFamily: font, fontSize: 12, fontWeight: '600' },
  heroArtwork: { width: 190, justifyContent: 'center', alignItems: 'center', gap: 18 },
  heroCircle: { borderRadius: 100, width: 150, height: 150, backgroundColor: '#3C5539', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#52694A' },
  heroTag: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stats: { flexDirection: 'row', borderWidth: 1, borderColor: color.line, backgroundColor: color.paper, borderRadius: 18, paddingVertical: 23, paddingHorizontal: 12, gap: 16 },
  stat: { flex: 1, paddingHorizontal: 12, gap: 8 }, statLabel: { fontFamily: font, color: color.muted, fontSize: 11 },
  statValue: { color: color.ink, fontFamily: font, fontSize: 27, letterSpacing: -0.9, fontWeight: '600', fontVariant: ['tabular-nums'] },
  candidate: { flexDirection: 'row', gap: 12, alignItems: 'center', paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: '#F0F2EB' },
  add: { minWidth: 40, minHeight: 44, justifyContent: 'center', alignItems: 'center', borderRadius: 10, backgroundColor: color.canvas },
  rowName: { color: color.ink, fontFamily: font, fontSize: 13, fontWeight: '600', lineHeight: 19 },
  completion: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13 },
  divider: { borderTopColor: '#F0F2EB', borderTopWidth: 1 }, timer: { fontFamily: font, fontVariant: ['tabular-nums'], color: color.green, fontSize: 14, fontWeight: '600' },
  progressNote: { backgroundColor: '#EDF2E3', borderRadius: 20, padding: 24, flexDirection: 'row', gap: 10, alignItems: 'center', flex: 1 },
  noteEyebrow: { color: '#78866A', fontFamily: font, fontWeight: '600', fontSize: 9, letterSpacing: 1.8 },
  noteTitle: { color: color.ink, fontFamily: font, fontWeight: '600', fontSize: 24, letterSpacing: -0.8, lineHeight: 31 },
  utilityRow: { flexDirection: 'row', gap: 22 }, utility: { flex: 1, borderWidth: 1, borderColor: color.line, borderRadius: 15, flexDirection: 'row', alignItems: 'center', padding: 20, gap: 14 },
  armyChoice: { flex: 1, borderWidth: 1, borderColor: color.line, backgroundColor: color.paper, borderRadius: 18, padding: 22, gap: 14, minHeight: 170 },
  sectionHeadline: { color: color.ink, fontSize: 17, fontWeight: '600', fontFamily: font, letterSpacing: -0.4 },
  readinessGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 22 }, readinessItem: { flexDirection: 'row', gap: 12, alignItems: 'center', paddingVertical: 10 },
  queueRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12 },
  queueNumber: { width: 34, height: 34, borderRadius: 10, backgroundColor: color.canvas, alignItems: 'center', justifyContent: 'center' },
  fieldEyebrow: { fontFamily: font, fontSize: 10, fontWeight: '600', color: color.muted, letterSpacing: 1 },
  timelineRow: { flexDirection: 'row', gap: 13 }, timelineDot: { width: 9, height: 9, borderRadius: 5 }, timelineLine: { flex: 1, width: 1, backgroundColor: color.line, marginVertical: 6 },
  timelineDate: { color: color.ink, fontFamily: font, fontSize: 12, lineHeight: 19 },
  equipmentGrid: { flexDirection: 'row', gap: 22, flexWrap: 'wrap' },
  target: { color: color.ink, fontFamily: font, fontSize: 17, fontWeight: '600', fontVariant: ['tabular-nums'], minWidth: 24, textAlign: 'center' },
  oreValue: { color: color.ink, fontFamily: font, fontSize: 19, fontWeight: '600', fontVariant: ['tabular-nums'] },
  bigNumber: { color: color.ink, fontSize: 46, fontWeight: '600', fontFamily: font, letterSpacing: -2, fontVariant: ['tabular-nums'] },
});

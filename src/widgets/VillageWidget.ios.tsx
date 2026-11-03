import { HStack, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import { containerBackground, font, foregroundStyle, lineLimit, monospacedDigit, padding, widgetURL } from '@expo/ui/swift-ui/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';
import type { WidgetProjection } from '../core/widgets';

function VillageLayout(props: WidgetProjection, environment: WidgetEnvironment<{ village: string }>) {
  'widget';
  const now = environment.date?.getTime() ?? Date.now();
  const tag = environment.configuration?.village ?? 'all';
  const account = props.accounts.find(item => item.tag === tag);
  const small = environment.widgetFamily === 'systemSmall';
  const large = environment.widgetFamily === 'systemLarge';
  const deleted = tag !== 'all' && !account;
  const selected = deleted ? [] : account ? [account] : props.accounts;
  const fullColor = environment.widgetRenderingMode === 'fullColor';
  const primary = fullColor ? '#FFFFFF' : { type: 'hierarchical' as const, style: 'primary' as const };
  const secondary = fullColor ? '#B8B8B8' : { type: 'hierarchical' as const, style: 'secondary' as const };
  return <VStack alignment="leading" spacing={small ? 5 : 7} modifiers={[
    containerBackground('#101010', 'widget'), padding({ all: 0 }),
    widgetURL(account ? `cocwidget://village?tag=${encodeURIComponent(account.tag)}` : 'cocwidget://villages'),
  ]}>
    <Text modifiers={[font({ size: small ? 16 : 18, weight: 'bold' }), foregroundStyle(primary), lineLimit(1)]}>{deleted ? 'Village removed' : account?.name ?? 'Your villages'}</Text>
    {!selected.length && <Text modifiers={[font({ size: 12 }), foregroundStyle(secondary), lineLimit(3)]}>{deleted ? 'Edit this widget to choose another village.' : 'Open COCWidget and import a village.'}</Text>}
    {selected.slice(0, account ? 1 : small ? 1 : large ? 4 : 2).map(item => {
      const active = item.rows.filter(row => row.end > now).sort((a, b) => a.end - b.end);
      const busy = active.filter(row => row.lane === 'builder' && !row.extra).length;
      return <VStack key={item.tag} alignment="leading" spacing={small ? 5 : 6}>
        <Text modifiers={[font({ size: 11, weight: 'medium' }), foregroundStyle(secondary), lineLimit(1)]}>{account ? `TH ${item.townHall} · ${Math.max(0, item.builders - busy)}/${item.builders} builders free*` : `${item.name} · TH ${item.townHall}`}{item.demo ? ' · SAMPLE' : ''}</Text>
        {active.slice(0, account ? small ? 1 : large ? 4 : 2 : 1).map(row => <VStack key={row.id} alignment="leading" spacing={3}>
          {small ? <>
            <Text modifiers={[font({ size: 12, weight: 'medium' }), foregroundStyle(primary), lineLimit(1)]}>{row.name}</Text>
            <Text timerInterval={{ lower: new Date(now), upper: new Date(row.end) }} countsDown modifiers={[font({ size: 22, weight: 'semibold' }), foregroundStyle(primary), monospacedDigit(), lineLimit(1)]} />
          </> : <HStack spacing={8}>
            <Text modifiers={[font({ size: 13, weight: 'medium' }), foregroundStyle(primary), lineLimit(1)]}>{row.name}</Text><Spacer />
            <Text timerInterval={{ lower: new Date(now), upper: new Date(row.end) }} countsDown modifiers={[font({ size: 16, weight: 'semibold' }), foregroundStyle(primary), monospacedDigit(), lineLimit(1)]} />
          </HStack>}
          {!small && (account || large) && <Text modifiers={[font({ size: 10 }), foregroundStyle(secondary), lineLimit(1)]}>{row.level} · {new Date(row.end).toLocaleString(undefined, { weekday: 'short', hour: 'numeric', minute: '2-digit' })}</Text>}
        </VStack>)}
        {!active.length && <Text modifiers={[font({ size: 12 }), foregroundStyle(primary), lineLimit(2)]}>No running timers</Text>}
        {account && large && item.nextAction && <Text modifiers={[font({ size: 12 }), foregroundStyle(secondary), lineLimit(1)]}>Next · {item.nextAction.name} {item.nextAction.level}</Text>}
      </VStack>;
    })}
    <Spacer />
    <Text modifiers={[font({ size: 10 }), foregroundStyle(secondary), lineLimit(1)]}>{account ? `${now - account.exportedAt > 86400000 ? 'Old export' : 'Saved'} ${new Date(account.exportedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}` : selected.some(item => now - item.exportedAt > 86400000) ? 'Older snapshots' : 'Saved snapshots'} · Estimates</Text>
  </VStack>;
}

export default createWidget<WidgetProjection, { village: string }>('VillageWidget', VillageLayout,
  { version: 1, generatedAt: 0, accounts: [] });

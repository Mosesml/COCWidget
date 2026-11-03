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
  const deletedSelection = tag !== 'all' && !account;
  const selected = deletedSelection ? [] : account ? [account] : props.accounts;
  const foreground = environment.widgetRenderingMode === 'fullColor' ? '#F0F6E8' : { type: 'hierarchical' as const, style: 'primary' as const };
  return <VStack alignment="leading" spacing={5} modifiers={[
    containerBackground('#253D2B', 'widget'), padding({ all: 0 }),
    widgetURL(account ? `cocwidget://village?tag=${encodeURIComponent(account.tag)}` : 'cocwidget://villages'),
  ]}>
    <HStack><Text modifiers={[font({ size: 15, weight: 'semibold' }), foregroundStyle(foreground), lineLimit(1)]}>{deletedSelection ? 'Village removed' : account?.name ?? 'Your villages'}</Text><Spacer /><Text modifiers={[font({ size: 11 }), foregroundStyle('#D8E9BC')]}>◈</Text></HStack>
    {!selected.length && <Text modifiers={[font({ size: 12 }), foregroundStyle(foreground)]}>{deletedSelection ? 'Choose another village in widget settings.' : 'Open COCWidget and import a village to begin.'}</Text>}
    {selected.slice(0, account ? 1 : small ? 1 : large ? 4 : 2).map(item => {
      const active = item.rows.filter(row => row.end > now).sort((a, b) => a.end - b.end);
      const busy = active.filter(row => row.lane === 'builder' && !row.extra).length;
      const stale = now - item.exportedAt > 86400000;
      return <VStack key={item.tag} alignment="leading" spacing={4}>
        <Text modifiers={[font({ size: 10, weight: 'medium' }), foregroundStyle('#C3D3B6'), lineLimit(1)]}>{account ? `TH ${item.townHall} · ${Math.max(0, item.builders - busy)} builders expected free` : `${item.name} · TH ${item.townHall}`}{item.demo ? ' · SAMPLE' : ''}</Text>
        {active.slice(0, account ? small ? 1 : large ? 4 : 2 : 1).map(row => <VStack key={row.id} alignment="leading" spacing={3}>
          <HStack spacing={8}><Text modifiers={[font({ size: 12 }), foregroundStyle(foreground), lineLimit(1)]}>{row.name}</Text><Spacer />
            <Text timerInterval={{ lower: new Date(now), upper: new Date(row.end) }} countsDown modifiers={[font({ size: 12, weight: 'medium' }), foregroundStyle('#D8E9BC'), monospacedDigit()]} />
          </HStack>
          <Text modifiers={[font({ size: 9 }), foregroundStyle('#C3D3B6'), lineLimit(1)]}>{row.level} · {new Date(row.end).toLocaleString(undefined, { weekday: 'short', hour: 'numeric', minute: '2-digit' })}</Text>
        </VStack>)}
        {!active.length && <Text modifiers={[font({ size: 12 }), foregroundStyle(foreground)]}>No running timers in this snapshot.</Text>}
        {account && !small && item.nextAction && <Text modifiers={[font({ size: 11 }), foregroundStyle('#C3D3B6'), lineLimit(large ? 2 : 1)]}>Next: {item.nextAction.name} {item.nextAction.level}</Text>}
        {account && !small && <Text modifiers={[font({ size: 9 }), foregroundStyle('#B3C5A5'), lineLimit(1)]}>{stale ? 'Older snapshot · ' : ''}Exported {new Date(item.exportedAt).toLocaleDateString()} · Estimates</Text>}
      </VStack>;
    })}
    <Spacer />
    {(small || !account) && <Text modifiers={[font({ size: 9 }), foregroundStyle('#B3C5A5'), lineLimit(1)]}>{account ? `Saved ${new Date(account.exportedAt).toLocaleDateString()}` : 'Saved snapshots'} · Estimates</Text>}
  </VStack>;
}

export default createWidget<WidgetProjection, { village: string }>('VillageWidget', VillageLayout,
  { version: 1, generatedAt: 0, accounts: [] });

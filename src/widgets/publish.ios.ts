import { requireOptionalNativeModule } from 'expo-modules-core';
import type { WidgetProjection } from '../core/widgets';
import { widgetDates } from '../core/widgets';

export async function publishWidgets(projection: WidgetProjection) {
  if (!requireOptionalNativeModule('ExpoWidgets')) return { available: false };
  const { default: widget } = await import('./VillageWidget.ios');
  widget.setConfigurationParameterEnum('village', [{ name: 'All villages', value: 'all' },
    ...projection.accounts.map(account => ({ name: account.name, value: account.tag }))]);
  widget.updateTimeline(widgetDates(projection, projection.generatedAt).map(time => ({ date: new Date(time), props: projection })));
  return { available: true };
}

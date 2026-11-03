import { requireOptionalNativeModule } from 'expo-modules-core';
import type { WidgetProjection } from '../core/widgets';

export async function publishWidgets(projection: WidgetProjection) {
  const bridge = requireOptionalNativeModule<{ saveProjection: (json: string) => Promise<void> }>('CocWidget');
  if (!bridge) return { available: false };
  await bridge.saveProjection(JSON.stringify(projection));
  return { available: true };
}

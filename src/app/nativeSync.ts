import { Platform } from 'react-native';
import { requireOptionalNativeModule } from 'expo-modules-core';
import type { SyncResult } from '../core/sync';

type Bridge = {
  reportSyncResult: (json: string) => Promise<void>;
  moveToBackground: () => Promise<void>;
  readIncomingExport: (requestId: string) => Promise<string>;
};
export async function reportNativeSync(result: SyncResult) {
  if (Platform.OS === 'android') await requireOptionalNativeModule<Bridge>('CocWidget')?.reportSyncResult(JSON.stringify(result));
}
export async function returnToBackground() {
  if (Platform.OS === 'android') await requireOptionalNativeModule<Bridge>('CocWidget')?.moveToBackground();
}
export async function readIncomingExport(requestId: string) {
  const bridge = requireOptionalNativeModule<Bridge>('CocWidget');
  if (!bridge) throw new Error('File delivery requires the Android native build.');
  return bridge.readIncomingExport(requestId);
}

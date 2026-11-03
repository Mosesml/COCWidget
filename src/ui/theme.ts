import { Platform } from 'react-native';

export const color = {
  canvas: '#F7F8F2', paper: '#FFFFFF', ink: '#253322', muted: '#76806E', line: '#E4E8DC',
  green: '#40613C', forest: '#253D2B', lime: '#D8E9BC', limeLight: '#EFF5E7',
  amber: '#D3A654', amberLight: '#FBF3E2', red: '#A54D3C', purple: '#8272AD', purpleLight: '#F0EDF6',
};
export const font = Platform.OS === 'web' ? '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' : undefined;

import { Image, View, type ImageSourcePropType } from 'react-native';
import { Icon, type IconName } from './components';
import { color } from './theme';

const artwork: Record<number, ImageSourcePropType> = {
  28000000: require('../../assets/28000000.webp'), 28000001: require('../../assets/28000001.webp'),
  28000002: require('../../assets/28000002.webp'), 28000004: require('../../assets/28000004.webp'),
  28000006: require('../../assets/28000006.webp'), 4000008: require('../../assets/4000008.webp'),
  90000022: require('../../assets/90000022.webp'), 90000014: require('../../assets/90000014.webp'),
  90000034: require('../../assets/90000034.webp'),
  73000008: require('../../assets/73000008.webp'),
};
export function Art({ id, size = 46, icon = 'builder', plain = false }: { id?: number; size?: number; icon?: IconName; plain?: boolean }) {
  const source = id ? artwork[id] : undefined;
  return <View style={{ width: size, height: size, borderRadius: Math.round(size / 4), backgroundColor: plain ? 'transparent' : color.limeLight, justifyContent: 'center', alignItems: 'center' }}>
    {source ? <Image source={source} style={{ width: size * 0.88, height: size * 0.88 }} resizeMode="contain" /> : <Icon name={icon} size={Math.round(size * 0.43)} tint={color.green} />}
  </View>;
}

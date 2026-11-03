import React, { useState, type ReactNode } from 'react';
import { ActivityIndicator, Image, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
  type ImageSourcePropType, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { color, font } from './theme';

const paths = {
  today: 'M3 10 12 3l9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z',
  army: 'm12 3 8 4v5c0 4-4 7-8 9-4-2-8-5-8-9V7Z M9 12l2 2 4-4',
  plan: 'M4 5h16v16H4Z M8 3v4 M16 3v4 M4 10h16 M8 14h2 M14 14h2 M8 18h2',
  equipment: 'm8 3 8 0 5 7-9 11L3 10Z M3 10h18 M8 3l4 7 4-7 M12 10v11',
  progress: 'M4 20V10 M10 20V4 M16 20v-8 M22 20H2',
  plus: 'M12 5v14 M5 12h14', arrow: 'M5 12h14 M14 7l5 5-5 5',
  chevron: 'm9 5 7 7-7 7', down: 'm6 9 6 6 6-6', check: 'm5 12 4 4L19 6',
  close: 'm6 6 12 12 M6 18 18 6', import: 'M12 3v12 M7 10l5 5 5-5 M4 16v5h16v-5',
  clock: 'M12 7v5l3 2', settings: 'M4 7h16 M4 17h16 M9 4v6 M15 14v6',
  grid: 'M3 3h7v7H3Z M14 3h7v7h-7Z M3 14h7v7H3Z M14 14h7v7h-7Z',
  help: 'M9 9a3 3 0 1 1 4.5 2.6c-1 .5-1.5 1-1.5 2.4 M12 17h.01',
  book: 'M3 4h7l2 2 2-2h7v15h-7l-2 2-2-2H3Z M12 6v15',
  builder: 'm14 3 7 7-4 4-7-7Z M12 9 3 18l3 3 9-9',
  leaf: 'M20 3c0 12-4 17-10 17a7 7 0 0 1-7-7c0-6 5-10 17-10Z M5 18l9-9',
  search: 'M15 15l6 6', share: 'M12 16V3 M7 8l5-5 5 5 M4 13v8h16v-8',
  trash: 'M4 6h16 M9 6V3h6v3 M6 6l1 15h10l1-15 M10 10v7 M14 10v7',
  sparkle: 'm12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5Z',
  back: 'M19 12H5 M10 7l-5 5 5 5',
} as const;
export type IconName = keyof typeof paths;
export function Icon({ name, size = 20, tint = color.muted }: { name: IconName; size?: number; tint?: string }) {
  return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={tint} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
    {(name === 'clock' || name === 'help' || name === 'search') && <Circle cx={name === 'search' ? 10 : 12} cy={name === 'search' ? 10 : 12} r={name === 'search' ? 7 : 9} />}
    <Path d={paths[name]} />
  </Svg>;
}
export function Wordmark({ small = false }: { small?: boolean }) {
  return <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
    <View style={[styles.logo, small && { width: 32, height: 32, borderRadius: 10 }]}>
      <Svg width={small ? 22 : 27} height={small ? 22 : 27} viewBox="0 0 30 30"><Rect x="3" y="3" width="10" height="10" rx="2" fill="#DAEABC" /><Rect x="17" y="3" width="10" height="10" rx="2" fill="#DAEABC" opacity="0.45" /><Rect x="3" y="17" width="10" height="10" rx="2" fill="#DAEABC" opacity="0.45" /><Rect x="17" y="17" width="10" height="10" rx="2" fill="#DAEABC" /></Svg>
    </View><Text style={{ fontFamily: font, fontWeight: '700', fontSize: small ? 18 : 20, color: color.ink, letterSpacing: -0.7 }}>cocwidget<Text style={{ color: color.green }}>.</Text></Text>
  </View>;
}
export function Button({ children, onPress, icon, tone = 'primary', disabled = false, compact = false, testID, busy = false }: {
  children: ReactNode; onPress: () => void; icon?: IconName; tone?: 'primary' | 'secondary' | 'ghost' | 'danger'; disabled?: boolean; compact?: boolean; testID?: string; busy?: boolean;
}) {
  const foreground = tone === 'primary' ? color.paper : tone === 'danger' ? color.red : color.ink;
  const [hovered, setHovered] = useState(false), [focused, setFocused] = useState(false);
  return <Pressable testID={testID} accessibilityRole="button" accessibilityState={{ disabled: disabled || busy }} disabled={disabled || busy} onPress={onPress}
    onHoverIn={() => setHovered(true)} onHoverOut={() => setHovered(false)} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
    style={({ pressed }) => [styles.button, compact && { paddingHorizontal: 12 },
      tone === 'primary' ? styles.primary : tone === 'ghost' ? { backgroundColor: 'transparent', borderColor: 'transparent' } : styles.secondary,
      tone === 'danger' && { backgroundColor: '#FFF3EF', borderColor: '#F1D8D1' },
      hovered && { opacity: 0.9 }, focused && Platform.OS === 'web' && { outlineStyle: 'solid', outlineWidth: 2, outlineColor: color.green, outlineOffset: 3 },
      pressed && { transform: [{ scale: 0.96 }] }, (disabled || busy) && { opacity: 0.5 }]}>
    {busy ? <ActivityIndicator size="small" color={foreground} /> : icon ? <Icon name={icon} size={17} tint={foreground} /> : null}
    <Text style={[styles.buttonText, { color: foreground }]}>{children}</Text>
  </Pressable>;
}
export function Chip({ children, tone = 'green' }: { children: ReactNode; tone?: 'green' | 'amber' | 'purple' | 'gray' }) {
  const palette = tone === 'amber' ? [color.amberLight, '#8A672C'] : tone === 'purple' ? [color.purpleLight, color.purple] : tone === 'gray' ? ['#F0F2EB', color.muted] : [color.limeLight, color.green];
  return <View style={{ paddingHorizontal: 9, paddingVertical: 5, borderRadius: 7, backgroundColor: palette[0], alignSelf: 'flex-start' }}><Text style={{ color: palette[1], fontFamily: font, fontSize: 11, fontWeight: '600' }}>{children}</Text></View>;
}
export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}
export function SectionTitle({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return <View style={styles.sectionHeading}><View style={{ flex: 1, gap: 5 }}><Text style={styles.sectionTitle}>{title}</Text>{subtitle && <Text style={styles.caption}>{subtitle}</Text>}</View>{action}</View>;
}
export function Meter({ value, tint = color.green, track = color.line, height = 5 }: { value: number; tint?: string; track?: string; height?: number }) {
  return <View style={{ backgroundColor: track, height, borderRadius: height, overflow: 'hidden' }}><View style={{ backgroundColor: tint, height, width: `${Math.max(0, Math.min(1, value)) * 100}%`, borderRadius: height }} /></View>;
}
export function Field({ label, value, onChange, placeholder, numeric = false, multiline = false, testID }: {
  label: string; value: string; onChange: (value: string) => void; placeholder?: string; numeric?: boolean; multiline?: boolean; testID?: string;
}) {
  return <View style={{ gap: 7, flex: multiline ? undefined : 1 }}><Text style={styles.fieldLabel}>{label}</Text>
    <TextInput testID={testID} accessibilityLabel={label} value={value} onChangeText={onChange} placeholder={placeholder} placeholderTextColor={color.muted}
      keyboardType={numeric ? 'number-pad' : 'default'} multiline={multiline} autoCapitalize="none" autoCorrect={false}
      style={[styles.input, multiline && { minHeight: 180, maxHeight: 260, textAlignVertical: 'top', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontSize: 12 }]} />
  </View>;
}
export function Sheet({ title, subtitle, children, onClose, wide = false }: { title: string; subtitle?: string; children: ReactNode; onClose: () => void; wide?: boolean }) {
  return <Modal transparent animationType="fade" visible onRequestClose={onClose}>
    <View style={styles.scrim}><Pressable accessible={false} onPress={onClose} style={StyleSheet.absoluteFill} />
      <View accessibilityViewIsModal style={[styles.sheet, { maxWidth: wide ? 850 : 560 }]}>
        <View style={styles.sheetHeader}><View style={{ flex: 1, gap: 6 }}><Text accessibilityRole="header" style={styles.sheetTitle}>{title}</Text>{subtitle && <Text style={styles.caption}>{subtitle}</Text>}</View><Pressable accessibilityRole="button" accessibilityLabel="Close dialog" onPress={onClose} style={styles.close}><Icon name="close" /></Pressable></View>
        <ScrollView contentContainerStyle={{ padding: 24, gap: 18 }} keyboardShouldPersistTaps="handled">{children}</ScrollView>
      </View>
    </View>
  </Modal>;
}
export function Empty({ title, message, icon = 'leaf', action }: { title: string; message: string; icon?: IconName; action?: ReactNode }) {
  return <View style={{ padding: 30, alignItems: 'center', gap: 12 }}><Icon name={icon} size={30} tint={color.green} /><Text style={styles.sectionTitle}>{title}</Text><Text style={[styles.caption, { textAlign: 'center', maxWidth: 380, lineHeight: 22 }]}>{message}</Text>{action}</View>;
}
export function ErrorNote({ message }: { message: string }) {
  return <View accessibilityRole="alert" style={{ borderRadius: 12, backgroundColor: '#FFF1EC', padding: 14 }}><Text style={{ color: color.red, lineHeight: 21, fontFamily: font, fontSize: 13 }}>{message}</Text></View>;
}
export const styles = StyleSheet.create({
  logo: { width: 40, height: 40, borderRadius: 12, backgroundColor: color.forest, alignItems: 'center', justifyContent: 'center' },
  card: { backgroundColor: color.paper, borderRadius: 20, padding: 24, borderWidth: 1, borderColor: color.line, gap: 16 },
  button: { minHeight: 44, paddingHorizontal: 17, paddingVertical: 10, borderRadius: 11, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 },
  primary: { backgroundColor: color.forest, borderColor: color.forest }, secondary: { backgroundColor: color.paper, borderColor: color.line },
  buttonText: { fontFamily: font, fontSize: 13, fontWeight: '600' },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  sectionTitle: { fontFamily: font, color: color.ink, fontSize: 18, fontWeight: '600', letterSpacing: -0.5 },
  caption: { fontFamily: font, fontSize: 12, color: color.muted, lineHeight: 19 },
  fieldLabel: { fontFamily: font, fontSize: 12, color: color.ink, fontWeight: '600' },
  input: { backgroundColor: color.canvas, minHeight: 46, borderWidth: 1, borderColor: color.line, borderRadius: 10, paddingHorizontal: 13, paddingVertical: 12, fontFamily: font, fontSize: 14, color: color.ink },
  scrim: { flex: 1, backgroundColor: '#13201470', justifyContent: 'center', alignItems: 'center', padding: 16 },
  sheet: { backgroundColor: color.paper, borderRadius: 24, width: '100%', maxHeight: '90%', overflow: 'hidden', borderWidth: 1, borderColor: color.line },
  sheetHeader: { padding: 24, borderBottomColor: color.line, borderBottomWidth: 1, flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
  sheetTitle: { fontFamily: font, color: color.ink, fontWeight: '600', fontSize: 23, letterSpacing: -0.6 },
  close: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center', borderRadius: 12, backgroundColor: color.canvas },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  body: { fontFamily: font, color: color.ink, fontSize: 14, lineHeight: 22 },
  mono: { fontVariant: ['tabular-nums'] },
});

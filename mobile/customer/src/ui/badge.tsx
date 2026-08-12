import { StyleSheet, Text, View } from 'react-native';
import { COLORS, RADIUS } from './theme';

export function Badge({
  label,
  tone = 'primary',
}: {
  label: string;
  tone?: 'primary' | 'accent' | 'danger' | 'muted' | 'success';
}) {
  return (
    <View style={[styles.badge, toneStyles[tone]]}>
      <Text style={[styles.text, toneText[tone]]}>{label}</Text>
    </View>
  );
}

const toneStyles = StyleSheet.create({
  primary: { backgroundColor: 'rgba(20,83,45,0.12)' },
  accent: { backgroundColor: COLORS.secondary },
  danger: { backgroundColor: '#FEE2E2' },
  muted: { backgroundColor: '#F3F4F6' },
  success: { backgroundColor: '#D1FAE5' },
});

const toneText = StyleSheet.create({
  primary: { color: COLORS.primary },
  accent: { color: COLORS.text },
  danger: { color: COLORS.danger },
  muted: { color: COLORS.textMuted },
  success: { color: COLORS.success },
});

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderRadius: RADIUS.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  text: { fontSize: 10, fontWeight: '800' },
});

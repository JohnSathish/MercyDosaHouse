import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { COLORS, RADIUS } from './theme';

export function SearchBar({
  value,
  onChangeText,
  placeholder = 'Search for dosa, idli, biryani…',
  onFocus,
  autoFocus,
}: {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  onFocus?: () => void;
  autoFocus?: boolean;
}) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.icon}>🔍</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={COLORS.textLight}
        autoFocus={autoFocus}
        onFocus={onFocus}
        returnKeyType="search"
        clearButtonMode="while-editing"
      />
      {value.length > 0 ? (
        <Pressable onPress={() => onChangeText('')} hitSlop={8}>
          <Text style={styles.clear}>✕</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    minHeight: 50,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  icon: { fontSize: 16, marginRight: 8 },
  input: { flex: 1, fontSize: 14, color: COLORS.text, paddingVertical: 12 },
  clear: { color: COLORS.textLight, fontSize: 14, padding: 4 },
});

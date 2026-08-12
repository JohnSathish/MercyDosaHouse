import { Tabs } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCartStore } from '@/stores/cart-store';
import { useThemeColors } from '@/providers/config-context';
import { FloatingCartBar } from '@/ui';

function TabIcon({ label, focused, color }: { label: string; focused: boolean; color: string }) {
  return (
    <View style={[styles.iconWrap, focused && styles.iconFocused]}>
      <Text style={{ fontSize: 18, opacity: focused ? 1 : 0.7 }}>{label}</Text>
      {focused ? <View style={[styles.dot, { backgroundColor: color }]} /> : null}
    </View>
  );
}

export default function TabLayout() {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const cartCount = useCartStore((s) => s.itemCount());
  const tabHeight = 58 + Math.max(insets.bottom, 8);

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: '#9CA3AF',
          tabBarStyle: {
            backgroundColor: '#fff',
            borderTopColor: '#E5E7EB',
            height: tabHeight,
            paddingBottom: Math.max(insets.bottom, 8),
            paddingTop: 6,
          },
          tabBarLabelStyle: { fontSize: 11, fontWeight: '700' },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            tabBarIcon: ({ focused, color }) => (
              <TabIcon label="🏠" focused={focused} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="menu"
          options={{
            title: 'Menu',
            tabBarIcon: ({ focused, color }) => (
              <TabIcon label="🍽️" focused={focused} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="cart"
          options={{
            title: 'Cart',
            tabBarBadge: cartCount > 0 ? cartCount : undefined,
            tabBarBadgeStyle: {
              backgroundColor: colors.secondary,
              color: '#1F2937',
              fontSize: 10,
              fontWeight: '800',
            },
            tabBarIcon: ({ focused, color }) => (
              <TabIcon label="🛒" focused={focused} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="orders"
          options={{
            title: 'Orders',
            tabBarIcon: ({ focused, color }) => (
              <TabIcon label="📦" focused={focused} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            tabBarIcon: ({ focused, color }) => (
              <TabIcon label="👤" focused={focused} color={color} />
            ),
          }}
        />
      </Tabs>
      <FloatingCartBar />
    </View>
  );
}

const styles = StyleSheet.create({
  iconWrap: { alignItems: 'center', justifyContent: 'center', minHeight: 28 },
  iconFocused: { transform: [{ scale: 1.05 }] },
  dot: { width: 4, height: 4, borderRadius: 2, marginTop: 2 },
});

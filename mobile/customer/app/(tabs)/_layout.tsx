import { Tabs } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCartStore } from '@/stores/cart-store';
import { useThemeColors } from '@/providers/config-context';
import { FloatingCartBar } from '@/ui';

function TabIcon({ label, focused, color }: { label: string; focused: boolean; color: string }) {
  return (
    <View style={[styles.iconWrap, focused && styles.iconFocused]}>
      <View style={[styles.iconBubble, focused && { backgroundColor: `${color}18` }]}>
        <Text style={{ fontSize: 18, opacity: focused ? 1 : 0.65 }}>{label}</Text>
      </View>
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
            borderTopWidth: 0,
            height: tabHeight,
            paddingBottom: Math.max(insets.bottom, 8),
            paddingTop: 8,
            elevation: 16,
            shadowColor: '#14532D',
            shadowOpacity: 0.1,
            shadowRadius: 12,
            shadowOffset: { width: 0, height: -4 },
          },
          tabBarLabelStyle: { fontSize: 11, fontWeight: '800' },
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
  iconFocused: { transform: [{ scale: 1.06 }] },
  iconBubble: {
    width: 36,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

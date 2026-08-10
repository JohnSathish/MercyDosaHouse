import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { useCartStore } from '@/stores/cart-store';
import { useThemeColors } from '@/providers/config-context';

function TabIcon({ label }: { label: string }) {
  return <Text style={{ fontSize: 18 }}>{label}</Text>;
}

export default function TabLayout() {
  const colors = useThemeColors();
  const cartCount = useCartStore((s) => s.itemCount());

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopColor: '#E5E7EB',
          height: 62,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Home', tabBarIcon: () => <TabIcon label="🏠" /> }}
      />
      <Tabs.Screen
        name="menu"
        options={{ title: 'Menu', tabBarIcon: () => <TabIcon label="🍽️" /> }}
      />
      <Tabs.Screen
        name="cart"
        options={{
          title: cartCount > 0 ? `Cart (${cartCount})` : 'Cart',
          tabBarIcon: () => <TabIcon label="🛒" />,
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{ title: 'Orders', tabBarIcon: () => <TabIcon label="📦" /> }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: 'Profile', tabBarIcon: () => <TabIcon label="👤" /> }}
      />
    </Tabs>
  );
}

import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { theme } from '@/ui/theme';
import { useOrdersSocket } from '@/hooks/use-orders-socket';
import { useAuth } from '@/providers/auth-provider';

function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  const map: Record<string, string> = {
    Dashboard: '▣',
    Orders: '☰',
    POS: '◫',
    Menu: '▤',
    More: '⋯',
  };
  return (
    <Text
      style={{ fontSize: 16, color: focused ? theme.colors.secondary : 'rgba(255,255,255,0.65)' }}
    >
      {map[label] || '•'}
    </Text>
  );
}

export default function TabsLayout() {
  const { user } = useAuth();
  const AdminTabs = Tabs as any;
  useOrdersSocket(!!user);

  return (
    <AdminTabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.secondary,
        tabBarInactiveTintColor: 'rgba(255,255,255,0.65)',
        tabBarStyle: {
          backgroundColor: theme.colors.primary,
          borderTopColor: 'rgba(255,255,255,0.08)',
          height: 62,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700' },
      }}
    >
      <AdminTabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ focused }: { focused: boolean }) => (
            <TabIcon label="Dashboard" focused={focused} />
          ),
        }}
      />
      <AdminTabs.Screen
        name="orders"
        options={{
          title: 'Orders',
          tabBarIcon: ({ focused }: { focused: boolean }) => (
            <TabIcon label="Orders" focused={focused} />
          ),
        }}
      />
      <AdminTabs.Screen
        name="pos"
        options={{
          title: 'POS',
          tabBarIcon: ({ focused }: { focused: boolean }) => (
            <TabIcon label="POS" focused={focused} />
          ),
        }}
      />
      <AdminTabs.Screen
        name="menu"
        options={{
          title: 'Menu',
          tabBarIcon: ({ focused }: { focused: boolean }) => (
            <TabIcon label="Menu" focused={focused} />
          ),
        }}
      />
      <AdminTabs.Screen
        name="more"
        options={{
          title: 'More',
          tabBarIcon: ({ focused }: { focused: boolean }) => (
            <TabIcon label="More" focused={focused} />
          ),
        }}
      />
    </AdminTabs>
  );
}

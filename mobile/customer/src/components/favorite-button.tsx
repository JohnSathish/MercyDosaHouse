import { useQuery } from '@tanstack/react-query';
import { Pressable, Text } from 'react-native';
import { router } from 'expo-router';
import { api } from '@/lib/api';
import { hapticTap } from '@/lib/haptics';
import { useFeatureFlag } from '@/providers/config-context';
import { useAuth } from '@/providers/auth-provider';

export function FavoriteButton({ productId, size = 22 }: { productId: string; size?: number }) {
  const enabled = useFeatureFlag('wishlist');
  const { user } = useAuth();
  const { data: favoritesRaw = [], refetch } = useQuery({
    queryKey: ['favorites'],
    queryFn: () => api.get<{ id: string }[] | { data: { id: string }[] }>('/users/me/favorites'),
    enabled: enabled && Boolean(user),
  });

  if (!enabled) return null;

  const favorites = Array.isArray(favoritesRaw)
    ? favoritesRaw
    : Array.isArray(favoritesRaw.data)
      ? favoritesRaw.data
      : [];
  const isFav = favorites.some((p) => p.id === productId);

  async function toggle() {
    hapticTap();
    if (!user) {
      router.push({ pathname: '/(auth)/login', params: { returnTo: '/favorites' } });
      return;
    }
    try {
      if (isFav) await api.delete(`/users/me/favorites/${productId}`);
      else await api.post(`/users/me/favorites/${productId}`);
      refetch();
    } catch {
      /* ignore */
    }
  }

  return (
    <Pressable onPress={() => void toggle()} hitSlop={8} accessibilityLabel="Favorite">
      <Text style={{ fontSize: size }}>{isFav ? '❤️' : '🤍'}</Text>
    </Pressable>
  );
}

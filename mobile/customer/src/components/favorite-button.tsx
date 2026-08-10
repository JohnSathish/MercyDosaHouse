import { useQuery } from '@tanstack/react-query';
import { Pressable, Text } from 'react-native';
import { api } from '@/lib/api';
import { useFeatureFlag } from '@/providers/config-context';

export function FavoriteButton({ productId, size = 22 }: { productId: string; size?: number }) {
  const enabled = useFeatureFlag('wishlist');
  const { data: favorites = [], refetch } = useQuery({
    queryKey: ['favorites'],
    queryFn: () => api.get<{ id: string }[]>('/users/me/favorites'),
    enabled,
  });

  if (!enabled) return null;

  const isFav = favorites.some((p) => p.id === productId);

  async function toggle() {
    try {
      if (isFav) await api.delete(`/users/me/favorites/${productId}`);
      else await api.post(`/users/me/favorites/${productId}`);
      refetch();
    } catch {
      /* auth required */
    }
  }

  return (
    <Pressable onPress={toggle} hitSlop={8}>
      <Text style={{ fontSize: size }}>{isFav ? '❤️' : '🤍'}</Text>
    </Pressable>
  );
}

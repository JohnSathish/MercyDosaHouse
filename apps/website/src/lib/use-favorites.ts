'use client';

import { useCallback, useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { getStoredUser, isAuthenticated } from '@mdh/auth-client';
import type { ProductDto } from '@mdh/types';
import { api } from '@/lib/api';
import { userQueryKey } from '@/lib/auth-queries';
import { useToastStore } from '@/lib/toast-store';

export function useFavorites() {
  const [mounted, setMounted] = useState(false);
  const [userId, setUserId] = useState<string | undefined>();
  const queryClient = useQueryClient();
  const toast = useToastStore((s) => s.show);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
    setUserId(getStoredUser()?.id);
  }, []);

  const authed = mounted && isAuthenticated();

  const query = useQuery({
    queryKey: userQueryKey('my-favorites', userId),
    queryFn: () => api.get<ProductDto[]>('/users/me/favorites'),
    enabled: authed,
    staleTime: 30_000,
  });

  const favorites = query.data ?? [];

  const mutation = useMutation({
    mutationFn: async ({ productId, isFav }: { productId: string; isFav: boolean }) => {
      if (isFav) await api.delete(`/users/me/favorites/${productId}`);
      else await api.post(`/users/me/favorites/${productId}`);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: userQueryKey('my-favorites', userId) });
    },
    onError: () => toast('Could not update favorites. Please try again.'),
  });

  const isFavorite = useCallback(
    (productId: string) => favorites.some((p) => p.id === productId),
    [favorites],
  );

  const toggleFavorite = useCallback(
    (productId: string) => {
      if (!isAuthenticated()) {
        toast('Sign in to save favorites.');
        router.push('/login');
        return;
      }
      const isFav = favorites.some((p) => p.id === productId);
      mutation.mutate({ productId, isFav });
    },
    [favorites, mutation, router, toast],
  );

  return { isFavorite, toggleFavorite };
}

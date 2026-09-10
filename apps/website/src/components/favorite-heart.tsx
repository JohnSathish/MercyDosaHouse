'use client';

import { FiHeart } from 'react-icons/fi';
import { cn } from '@mdh/ui';
import { useFavorites } from '@/lib/use-favorites';

export function FavoriteHeart({
  productId,
  className,
  iconClassName = 'w-5 h-5',
}: {
  productId: string;
  className?: string;
  iconClassName?: string;
}) {
  const { isFavorite, toggleFavorite } = useFavorites();
  const fav = isFavorite(productId);

  return (
    <button
      type="button"
      className={cn(
        'shrink-0 text-gray-400 transition-colors hover:text-red-500',
        fav && 'text-red-500',
        className,
      )}
      aria-label={fav ? 'Remove from favorites' : 'Save to favorites'}
      aria-pressed={fav}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleFavorite(productId);
      }}
    >
      <FiHeart className={cn(iconClassName, fav && 'fill-red-500')} />
    </button>
  );
}

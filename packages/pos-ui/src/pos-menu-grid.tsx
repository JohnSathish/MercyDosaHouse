'use client';

import { cn } from '@mdh/ui';
import { formatCurrency, FOOD_TYPE_LABELS } from '@mdh/utils';
import type { PosMenuProductDto } from '@mdh/types';
import { motion } from 'framer-motion';
import { Clock, Plus, Settings2, Star } from 'lucide-react';
import type { MenuFilter } from './pos-theme';
import { POS_THEME } from './pos-theme';

const FILTERS: { value: MenuFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'veg', label: 'Veg Only' },
  { value: 'nonveg', label: 'Non Veg' },
  { value: 'popular', label: 'Popular' },
  { value: 'available', label: 'Available' },
];

interface PosMenuGridProps {
  products: PosMenuProductDto[];
  menuFilter: MenuFilter;
  searchQuery?: string;
  highlightIndex?: number;
  onFilterChange: (f: MenuFilter) => void;
  onAdd: (product: PosMenuProductDto, el?: HTMLElement) => void;
  onCustomize: (product: PosMenuProductDto) => void;
  darkMode: boolean;
  loading?: boolean;
}

function highlightName(name: string, query?: string) {
  if (!query?.trim()) return name;
  const q = query.trim();
  const idx = name.toLowerCase().indexOf(q.toLowerCase());
  if (idx < 0) return name;
  return (
    <>
      {name.slice(0, idx)}
      <mark className="bg-amber-200 text-gray-900 rounded px-0.5">
        {name.slice(idx, idx + q.length)}
      </mark>
      {name.slice(idx + q.length)}
    </>
  );
}

export function PosMenuGrid({
  products,
  menuFilter,
  searchQuery,
  highlightIndex = 0,
  onFilterChange,
  onAdd,
  onCustomize,
  darkMode,
  loading,
}: PosMenuGridProps) {
  return (
    <main
      className={cn(
        'flex-1 flex flex-col min-w-0 overflow-hidden',
        darkMode ? 'bg-gray-950' : 'bg-[#EEF0F3]',
      )}
    >
      {/* Filter bar */}
      <div
        className={cn(
          'shrink-0 px-4 py-2.5 flex gap-2 overflow-x-auto border-b scrollbar-hide',
          darkMode ? 'bg-gray-900/80 border-gray-800' : 'bg-white border-gray-100',
        )}
      >
        {FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => onFilterChange(f.value)}
            className={cn(
              'shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition',
              menuFilter === f.value
                ? 'text-white'
                : darkMode
                  ? 'bg-gray-800 text-gray-400 hover:text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
            )}
            style={menuFilter === f.value ? { background: POS_THEME.primary } : undefined}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3">
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  'rounded-2xl h-52 animate-pulse',
                  darkMode ? 'bg-gray-800' : 'bg-gray-200',
                )}
              />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-16">
            <span className="text-5xl mb-3">🍽</span>
            <p className={cn('font-semibold', darkMode ? 'text-gray-300' : 'text-gray-600')}>
              No items found
            </p>
            <p className="text-sm text-gray-400 mt-1">Try a different category or filter</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3">
            {products.map((p, i) => (
              <MenuCard
                key={p.id}
                product={p}
                darkMode={darkMode}
                highlighted={i === highlightIndex}
                searchQuery={searchQuery}
                onAdd={(el) => onAdd(p, el)}
                onCustomize={() => onCustomize(p)}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

function MenuCard({
  product,
  darkMode,
  highlighted,
  searchQuery,
  onAdd,
  onCustomize,
}: {
  product: PosMenuProductDto;
  darkMode: boolean;
  highlighted?: boolean;
  searchQuery?: string;
  onAdd: (el: HTMLElement) => void;
  onCustomize: () => void;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4, boxShadow: '0 12px 32px rgba(20,83,45,0.15)' }}
      className={cn(
        'group relative rounded-2xl overflow-hidden border flex flex-col',
        highlighted && 'ring-2 ring-amber-400 ring-offset-2',
        darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100',
      )}
      style={{ borderRadius: POS_THEME.radius }}
    >
      {/* Image */}
      <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
        {product.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.imageUrl}
            alt={product.name}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl bg-gradient-to-br from-emerald-50 to-amber-50">
            🍽
          </div>
        )}

        {/* Badges */}
        <div className="absolute top-2 left-2 flex flex-wrap gap-1">
          <span
            className={cn(
              'px-1.5 py-0.5 rounded text-[9px] font-bold uppercase',
              product.foodType === 'VEG' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white',
            )}
          >
            {FOOD_TYPE_LABELS[product.foodType]}
          </span>
          {product.isPopular && (
            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500 text-white flex items-center gap-0.5">
              <Star className="h-2.5 w-2.5 fill-white" /> Best
            </span>
          )}
        </div>

        {!product.isAvailable && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <span className="text-white text-xs font-bold px-2 py-1 rounded bg-red-600">
              Out of Stock
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-3 flex-1 flex flex-col">
        <h3
          className={cn(
            'font-bold text-sm leading-tight line-clamp-2',
            darkMode ? 'text-white' : 'text-gray-900',
          )}
        >
          {highlightName(product.name, searchQuery)}
        </h3>

        <div className="flex items-center gap-2 mt-1.5 text-[10px] text-gray-400">
          <span className="flex items-center gap-0.5">
            <Star className="h-3 w-3 text-amber-400 fill-amber-400" />
            4.8
          </span>
          <span className="flex items-center gap-0.5">
            <Clock className="h-3 w-3" />
            {product.prepTimeMinutes}m
          </span>
        </div>

        <div className="flex items-end justify-between mt-auto pt-2">
          <span className="text-base font-bold" style={{ color: POS_THEME.primary }}>
            {formatCurrency(product.price)}
          </span>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onCustomize();
              }}
              className={cn(
                'p-1.5 rounded-lg transition opacity-0 group-hover:opacity-100',
                darkMode ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-100 text-gray-500',
              )}
              aria-label="Customize"
            >
              <Settings2 className="h-3.5 w-3.5" />
            </button>
            <motion.button
              type="button"
              disabled={!product.isAvailable}
              whileTap={{ scale: 0.9 }}
              onClick={(e) => onAdd(e.currentTarget)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold text-white disabled:opacity-40"
              style={{ background: POS_THEME.primary }}
            >
              <Plus className="h-3.5 w-3.5" />
              Add
            </motion.button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

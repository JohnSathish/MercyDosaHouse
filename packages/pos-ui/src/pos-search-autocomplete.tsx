'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '@mdh/ui';
import { formatCurrency, FOOD_TYPE_LABELS } from '@mdh/utils';
import type { PosMenuProductDto } from '@mdh/types';
import { Clock, Search, Star, X } from 'lucide-react';
import { POS_THEME } from './pos-theme';
import {
  buildSearchIndex,
  resolveSuggestedProducts,
  searchMenuProducts,
} from './pos-search-engine';

function highlightMatch(name: string, query: string) {
  if (!query.trim()) return name;
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

type FlatRow =
  | { kind: 'header'; label: string }
  | { kind: 'item'; product: PosMenuProductDto; selectableIndex: number };

interface PosSearchAutocompleteProps {
  search: string;
  onSearchChange: (v: string) => void;
  products: PosMenuProductDto[];
  recentProductIds: string[];
  topProductIds: string[];
  onSelect: (product: PosMenuProductDto) => void;
  darkMode: boolean;
  inputRef?: React.RefObject<HTMLInputElement | null>;
  className?: string;
}

export function PosSearchAutocomplete({
  search,
  onSearchChange,
  products,
  recentProductIds,
  topProductIds,
  onSelect,
  darkMode,
  inputRef: externalRef,
  className,
}: PosSearchAutocompleteProps) {
  const internalRef = useRef<HTMLInputElement>(null);
  const inputRef = externalRef ?? internalRef;
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(0);

  const index = useMemo(() => buildSearchIndex(products), [products]);

  const searchResults = useMemo(
    () =>
      search.trim()
        ? searchMenuProducts(index, search, {
            recentIds: recentProductIds,
            topIds: topProductIds,
            limit: 10,
          })
        : [],
    [index, search, recentProductIds, topProductIds],
  );

  const suggestions = useMemo(
    () => resolveSuggestedProducts(products, recentProductIds, topProductIds),
    [products, recentProductIds, topProductIds],
  );

  const flatRows: FlatRow[] = useMemo(() => {
    const rows: FlatRow[] = [];
    let selectable = 0;

    if (search.trim()) {
      if (searchResults.length) {
        rows.push({ kind: 'header', label: 'Matching Items' });
        for (const product of searchResults) {
          rows.push({ kind: 'item', product, selectableIndex: selectable++ });
        }
      }
      return rows;
    }

    if (suggestions.recent.length) {
      rows.push({ kind: 'header', label: 'Recent Items' });
      for (const product of suggestions.recent) {
        rows.push({ kind: 'item', product, selectableIndex: selectable++ });
      }
    }
    if (suggestions.top.length) {
      rows.push({ kind: 'header', label: 'Most Ordered Today' });
      for (const product of suggestions.top) {
        rows.push({ kind: 'item', product, selectableIndex: selectable++ });
      }
    }
    if (!rows.length) {
      const popular = products.filter((p) => p.isPopular && p.isAvailable).slice(0, 6);
      if (popular.length) {
        rows.push({ kind: 'header', label: 'Popular Items' });
        for (const product of popular) {
          rows.push({ kind: 'item', product, selectableIndex: selectable++ });
        }
      }
    }
    return rows;
  }, [search, searchResults, suggestions, products]);

  const selectableItems = useMemo(
    () => flatRows.filter((r): r is Extract<FlatRow, { kind: 'item' }> => r.kind === 'item'),
    [flatRows],
  );

  useEffect(() => {
    setHighlightIndex(0);
  }, [search, flatRows.length]);

  useEffect(() => {
    if (!open) return;
    const el = listRef.current?.querySelector('[data-highlighted="true"]');
    el?.scrollIntoView({ block: 'nearest' });
  }, [highlightIndex, open]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const pickProduct = useCallback(
    (product: PosMenuProductDto) => {
      onSelect(product);
      onSearchChange('');
      setOpen(false);
      setHighlightIndex(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    },
    [onSelect, onSearchChange, inputRef],
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!open) setOpen(true);
      setHighlightIndex((i) => Math.min(i + 1, Math.max(selectableItems.length - 1, 0)));
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIndex((i) => Math.max(i - 1, 0));
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      const item = selectableItems[highlightIndex];
      if (item) pickProduct(item.product);
      return;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
      onSearchChange('');
      return;
    }
    if (e.key === 'Tab' && !e.shiftKey) {
      setOpen(false);
      const billPanel = document.getElementById('pos-bill-panel');
      if (billPanel) {
        e.preventDefault();
        billPanel.focus();
      }
    }
  };

  const showDropdown = open && (search.trim() ? true : flatRows.length > 0);

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <Search className="absolute left-3 top-1/2 -h-4 w-4 -translate-y-1/2 text-gray-400 pointer-events-none z-10" />
      <input
        ref={inputRef}
        type="text"
        autoComplete="off"
        spellCheck={false}
        placeholder="Search menu… (Ctrl+K)"
        value={search}
        onChange={(e) => {
          onSearchChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        className={cn(
          'w-full h-9 pl-9 pr-8 rounded-xl text-sm border outline-none focus:ring-2 focus:ring-emerald-500/30',
          darkMode
            ? 'bg-gray-800 border-gray-700 text-white placeholder:text-gray-500'
            : 'bg-gray-50 border-gray-200',
        )}
        aria-expanded={showDropdown}
        aria-autocomplete="list"
        aria-controls="pos-search-listbox"
        role="combobox"
      />
      {search && (
        <button
          type="button"
          onClick={() => {
            onSearchChange('');
            inputRef.current?.focus();
          }}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md text-gray-400 hover:text-gray-600 z-10"
          aria-label="Clear search"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}

      {showDropdown && (
        <div
          id="pos-search-listbox"
          ref={listRef}
          role="listbox"
          className={cn(
            'absolute left-0 right-0 top-full mt-1.5 z-[200] max-h-[min(420px,55vh)] overflow-y-auto rounded-xl border shadow-xl',
            darkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200',
          )}
          style={{ boxShadow: POS_THEME.shadowLg }}
        >
          {search.trim() && !searchResults.length && (
            <p className="px-4 py-6 text-sm text-center text-gray-400">No matching items</p>
          )}

          {flatRows.map((row, i) => {
            if (row.kind === 'header') {
              return (
                <div
                  key={`h-${row.label}-${i}`}
                  className={cn(
                    'sticky top-0 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider border-b',
                    darkMode
                      ? 'bg-gray-800/95 text-gray-400 border-gray-700'
                      : 'bg-gray-50 text-gray-500 border-gray-100',
                  )}
                >
                  🔍 {row.label}
                </div>
              );
            }

            const highlighted = row.selectableIndex === highlightIndex;
            const { product } = row;

            return (
              <button
                key={product.id}
                type="button"
                role="option"
                aria-selected={highlighted}
                data-highlighted={highlighted ? 'true' : undefined}
                onMouseEnter={() => setHighlightIndex(row.selectableIndex)}
                onClick={() => pickProduct(product)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 text-left transition border-b last:border-b-0',
                  highlighted
                    ? darkMode
                      ? 'bg-emerald-900/40 border-gray-800'
                      : 'bg-emerald-50 border-gray-100'
                    : darkMode
                      ? 'hover:bg-gray-800 border-gray-800'
                      : 'hover:bg-gray-50 border-gray-100',
                )}
              >
                {highlighted && (
                  <span className="text-emerald-600 font-bold shrink-0" aria-hidden>
                    ▶
                  </span>
                )}

                <div className="h-10 w-10 shrink-0 rounded-lg overflow-hidden bg-gray-100">
                  {product.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={product.imageUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-lg">🍽</div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={cn(
                        'w-2 h-2 rounded-full shrink-0',
                        product.isAvailable ? 'bg-emerald-500' : 'bg-red-400',
                      )}
                    />
                    <p
                      className={cn(
                        'font-semibold text-sm truncate',
                        darkMode ? 'text-white' : 'text-gray-900',
                      )}
                    >
                      {highlightMatch(product.name, search)}
                    </p>
                  </div>
                  <p className="text-[11px] text-gray-400 truncate">{product.categoryName}</p>
                  <div className="flex items-center gap-2 mt-0.5 text-[10px] text-gray-400">
                    <span
                      className={cn(
                        'px-1 py-0.5 rounded text-[9px] font-bold uppercase',
                        product.foodType === 'VEG'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-red-100 text-red-700',
                      )}
                    >
                      {FOOD_TYPE_LABELS[product.foodType]}
                    </span>
                    <span className="flex items-center gap-0.5">
                      <Star className="h-2.5 w-2.5 text-amber-400 fill-amber-400" />
                      4.8
                    </span>
                    <span className="flex items-center gap-0.5">
                      <Clock className="h-2.5 w-2.5" />
                      {product.prepTimeMinutes} min
                    </span>
                    {product.isPopular && (
                      <span className="text-amber-600 font-semibold">★ Best</span>
                    )}
                    <span className={product.isAvailable ? 'text-emerald-600' : 'text-red-500'}>
                      {product.isAvailable ? 'Available' : 'Unavailable'}
                    </span>
                  </div>
                </div>

                <span className="font-bold text-sm shrink-0" style={{ color: POS_THEME.primary }}>
                  {formatCurrency(product.price)}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

'use client';

import { cn } from '@mdh/ui';
import type { PosMenuCategoryDto } from '@mdh/types';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { CATEGORY_ICONS, POS_THEME } from './pos-theme';

const VIRTUAL_CATEGORIES = [
  { id: '__all__', name: 'All Items', icon: '🍽' },
  { id: '__popular__', name: 'Popular', icon: '⭐' },
  { id: '__favorites__', name: 'Favorites', icon: '❤️' },
  { id: '__specials__', name: "Today's Specials", icon: '🔥' },
  { id: '__new__', name: 'New Items', icon: '🆕' },
];

function categoryIcon(cat: PosMenuCategoryDto): string {
  if (cat.icon) return cat.icon;
  const slug = cat.slug?.toLowerCase() ?? cat.name.toLowerCase();
  for (const [key, emoji] of Object.entries(CATEGORY_ICONS)) {
    if (slug.includes(key)) return emoji;
  }
  return '🍽';
}

interface PosCategorySidebarProps {
  categories: PosMenuCategoryDto[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  search: string;
  onSearchChange: (v: string) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  darkMode: boolean;
}

export function PosCategorySidebar({
  categories,
  selectedId,
  onSelect,
  search,
  onSearchChange,
  collapsed,
  onToggleCollapse,
  darkMode,
}: PosCategorySidebarProps) {
  return (
    <aside
      className={cn(
        'shrink-0 flex flex-col border-r transition-all duration-300 overflow-hidden',
        collapsed ? 'w-14' : 'w-56 lg:w-60',
        darkMode ? 'bg-gray-900/90 border-gray-800' : 'bg-white border-gray-200',
      )}
      style={{ boxShadow: collapsed ? undefined : POS_THEME.shadow }}
    >
      <div
        className={cn(
          'p-2 border-b flex items-center gap-1',
          darkMode ? 'border-gray-800' : 'border-gray-100',
        )}
      >
        {!collapsed && (
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
            <input
              type="search"
              placeholder="Category…"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              className={cn(
                'w-full h-8 pl-8 pr-2 rounded-lg text-xs border outline-none focus:ring-2 focus:ring-emerald-500/30',
                darkMode
                  ? 'bg-gray-800 border-gray-700 text-white placeholder:text-gray-500'
                  : 'bg-gray-50 border-gray-200',
              )}
            />
          </div>
        )}
        <button
          type="button"
          onClick={onToggleCollapse}
          className={cn(
            'p-1.5 rounded-lg shrink-0 transition hover:scale-105',
            darkMode ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-100 text-gray-500',
          )}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto p-2 space-y-1.5 scrollbar-thin">
        {!search.trim() &&
          VIRTUAL_CATEGORIES.map((vc) => (
            <CategoryCard
              key={vc.id}
              icon={vc.icon}
              name={vc.name}
              count={undefined}
              active={selectedId === vc.id}
              collapsed={collapsed}
              darkMode={darkMode}
              onClick={() => onSelect(vc.id)}
            />
          ))}

        {categories.map((cat) => {
          const available = cat.products.filter((p) => p.isAvailable).length;
          return (
            <CategoryCard
              key={cat.id}
              icon={categoryIcon(cat)}
              name={cat.name}
              count={cat.products.length}
              available={available}
              active={selectedId === cat.id}
              collapsed={collapsed}
              darkMode={darkMode}
              onClick={() => onSelect(cat.id)}
            />
          );
        })}
      </nav>
    </aside>
  );
}

function CategoryCard({
  icon,
  name,
  count,
  available,
  active,
  collapsed,
  darkMode,
  onClick,
}: {
  icon: string;
  name: string;
  count?: number;
  available?: number;
  active: boolean;
  collapsed: boolean;
  darkMode: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={collapsed ? name : undefined}
      className={cn(
        'w-full flex items-center gap-2.5 rounded-xl transition-all duration-200',
        'hover:scale-[1.02] active:scale-[0.98]',
        collapsed ? 'p-2 justify-center' : 'px-3 py-2.5',
        active
          ? 'text-white shadow-md'
          : darkMode
            ? 'text-gray-300 hover:bg-gray-800'
            : 'text-gray-700 hover:bg-gray-50 border border-transparent hover:border-gray-200',
      )}
      style={
        active
          ? {
              background: `linear-gradient(135deg, ${POS_THEME.primary} 0%, ${POS_THEME.primaryLight} 100%)`,
            }
          : undefined
      }
    >
      <span className="text-lg shrink-0">{icon}</span>
      {!collapsed && (
        <div className="flex-1 min-w-0 text-left">
          <p className="text-sm font-semibold truncate">{name}</p>
          {count !== undefined && (
            <p className={cn('text-[10px]', active ? 'text-white/80' : 'text-gray-400')}>
              {count} items
              {available !== undefined && available < count && (
                <span className="ml-1 text-amber-500">· {available} available</span>
              )}
            </p>
          )}
        </div>
      )}
      {!collapsed && count !== undefined && (
        <span
          className={cn(
            'w-2 h-2 rounded-full shrink-0',
            available === count
              ? 'bg-emerald-400'
              : available === 0
                ? 'bg-red-400'
                : 'bg-amber-400',
          )}
        />
      )}
    </button>
  );
}

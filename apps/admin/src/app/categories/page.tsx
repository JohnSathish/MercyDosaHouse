'use client';

import { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Layers,
  Search,
  Plus,
  Download,
  Upload,
  LayoutGrid,
  Table2,
  Columns3,
  Sparkles,
  ChevronDown,
} from 'lucide-react';
import { Button, cn } from '@mdh/ui';
import { api } from '@/lib/api';
import type {
  CategoryDashboardDto,
  AdminCategoryDto,
  CategoryViewMode,
  CategoryInsightDto,
} from '@mdh/types';
import { CategoryDashboard } from '@/components/categories/category-dashboard';
import { CategoryCard } from '@/components/categories/category-card';
import { CategoriesTable } from '@/components/categories/categories-table';
import { CategoriesKanban } from '@/components/categories/categories-kanban';
import { CategoryFormDialog } from '@/components/categories/category-form-dialog';
import { CategoryPreviewDialog } from '@/components/categories/category-preview-dialog';

const FILTERS = [
  { id: '', label: 'All' },
  { id: 'PUBLISHED', label: 'Active' },
  { id: 'INACTIVE', label: 'Inactive' },
  { id: 'featured', label: 'Featured' },
  { id: 'popular', label: 'Popular' },
  { id: 'empty', label: 'Empty' },
  { id: 'seasonal', label: 'Seasonal' },
];

export default function CategoriesPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('');
  const [viewMode, setViewMode] = useState<CategoryViewMode>('card');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [formOpen, setFormOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);

  const { data: dashboard, isLoading } = useQuery({
    queryKey: ['category-dashboard'],
    queryFn: () => api.get<CategoryDashboardDto>('/categories/dashboard'),
    staleTime: 30_000,
  });

  const { data: insights = [] } = useQuery({
    queryKey: ['category-insights'],
    queryFn: () => api.get<CategoryInsightDto[]>('/categories/insights'),
  });

  const queryParams = useMemo(() => {
    const p = new URLSearchParams();
    if (search.trim()) p.set('search', search.trim());
    if (filter === 'featured') p.set('featured', 'true');
    else if (filter === 'popular') p.set('popular', 'true');
    else if (filter === 'empty') p.set('empty', 'true');
    else if (filter === 'seasonal') p.set('seasonal', 'true');
    else if (filter) p.set('status', filter);
    return p.toString();
  }, [search, filter]);

  const categories = useMemo(() => {
    let list = dashboard?.categories ?? [];
    if (queryParams) {
      // client-side filter fallback when using dashboard data
      if (search.trim()) {
        const q = search.toLowerCase();
        list = list.filter(
          (c) =>
            c.name.toLowerCase().includes(q) ||
            c.slug.toLowerCase().includes(q) ||
            (c.description?.toLowerCase().includes(q) ?? false),
        );
      }
      if (filter === 'PUBLISHED') list = list.filter((c) => c.status === 'PUBLISHED');
      if (filter === 'INACTIVE') list = list.filter((c) => c.status === 'INACTIVE');
      if (filter === 'featured') list = list.filter((c) => c.isFeatured);
      if (filter === 'popular') list = list.filter((c) => c.isPopular);
      if (filter === 'empty') list = list.filter((c) => c.itemCount === 0);
      if (filter === 'seasonal') list = list.filter((c) => c.isSeasonal);
    }
    return list;
  }, [dashboard?.categories, search, filter, queryParams]);

  const editingCategory = editingId ? categories.find((c) => c.id === editingId) : null;
  const previewCategory = previewId ? categories.find((c) => c.id === previewId) : null;

  const refresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['category-dashboard'] });
  }, [queryClient]);

  const saveMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      editingId ? api.patch(`/categories/${editingId}`, data) : api.post('/categories', data),
    onSuccess: () => {
      refresh();
      setFormOpen(false);
      setEditingId(null);
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: (id: string) => api.post(`/categories/${id}/duplicate`, {}),
    onSuccess: refresh,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/categories/${id}`),
    onSuccess: refresh,
  });

  const bulkMutation = useMutation({
    mutationFn: ({ action, ids }: { action: string; ids: string[] }) =>
      api.post('/categories/bulk', { action, ids }),
    onSuccess: () => {
      refresh();
      setSelected(new Set());
      setBulkOpen(false);
    },
  });

  const reorderMutation = useMutation({
    mutationFn: (ids: string[]) => api.post('/categories/reorder', { ids }),
    onSuccess: refresh,
  });

  function handleDrop(targetId: string) {
    if (!dragId || dragId === targetId) return;
    const ids = categories.map((c) => c.id);
    const from = ids.indexOf(dragId);
    const to = ids.indexOf(targetId);
    if (from < 0 || to < 0) return;
    ids.splice(from, 1);
    ids.splice(to, 0, dragId);
    reorderMutation.mutate(ids);
    setDragId(null);
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function exportCsv() {
    const res = await api.get<{ csv: string }>('/categories/export');
    const blob = new Blob([res.csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'categories.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6 w-full">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Layers className="h-6 w-6 text-[#14532D]" />
          Categories
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Manage restaurant menu categories, display order, availability and customer visibility.
        </p>
      </div>

      <CategoryDashboard data={dashboard} loading={isLoading} />

      {/* AI Insights */}
      {insights.length > 0 && (
        <div className="grid sm:grid-cols-3 gap-3">
          {insights.map((insight, i) => (
            <motion.div
              key={insight.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className={cn(
                'rounded-2xl border p-4 backdrop-blur',
                insight.severity === 'positive' &&
                  'bg-emerald-50/80 dark:bg-emerald-950/20 border-emerald-200',
                insight.severity === 'warning' &&
                  'bg-amber-50/80 dark:bg-amber-950/20 border-amber-200',
                insight.severity === 'info' && 'bg-blue-50/80 dark:bg-blue-950/20 border-blue-200',
              )}
            >
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="h-4 w-4 text-[#14532D]" />
                <span className="text-xs font-bold uppercase text-muted-foreground">
                  Smart Insight
                </span>
              </div>
              <p className="text-sm font-medium">{insight.message}</p>
              <p className="text-xs text-muted-foreground mt-1">Suggested: {insight.suggestion}</p>
            </motion.div>
          ))}
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-col lg:flex-row gap-3 lg:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="search"
            placeholder="Search category, slug, description…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border bg-white dark:bg-gray-900 text-sm"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-xl border p-1 bg-muted/30">
            {(
              [
                ['card', LayoutGrid],
                ['table', Table2],
                ['kanban', Columns3],
              ] as const
            ).map(([mode, Icon]) => (
              <Button
                key={mode}
                size="sm"
                variant={viewMode === mode ? 'default' : 'ghost'}
                className={cn('rounded-lg', viewMode === mode && 'bg-[#14532D]')}
                onClick={() => setViewMode(mode)}
              >
                <Icon className="h-4 w-4" />
              </Button>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={exportCsv}>
            <Download className="h-4 w-4 mr-1" /> Export
          </Button>
          <Button variant="outline" size="sm">
            <Upload className="h-4 w-4 mr-1" /> Import
          </Button>
          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              disabled={selected.size === 0}
              onClick={() => setBulkOpen(!bulkOpen)}
            >
              Bulk Actions <ChevronDown className="h-3 w-3 ml-1" />
            </Button>
            {bulkOpen && selected.size > 0 && (
              <div className="absolute right-0 top-full mt-1 z-20 rounded-xl border bg-white dark:bg-gray-900 shadow-lg py-1 min-w-[140px]">
                {['publish', 'hide', 'duplicate', 'delete'].map((action) => (
                  <button
                    key={action}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-muted capitalize"
                    onClick={() => bulkMutation.mutate({ action, ids: [...selected] })}
                  >
                    {action}
                  </button>
                ))}
              </div>
            )}
          </div>
          <Button
            className="bg-[#14532D] hover:bg-[#14532D]/90"
            size="sm"
            onClick={() => {
              setEditingId(null);
              setFormOpen(true);
            }}
          >
            <Plus className="h-4 w-4 mr-1" /> New Category
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-1">
        {FILTERS.map((f) => (
          <Button
            key={f.id}
            size="sm"
            variant={filter === f.id ? 'default' : 'outline'}
            className={cn('rounded-full text-xs', filter === f.id && 'bg-[#14532D]')}
            onClick={() => setFilter(f.id)}
          >
            {f.label}
          </Button>
        ))}
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {isLoading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-72 rounded-2xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : viewMode === 'card' ? (
          <motion.div
            key="card"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
          >
            {categories.map((cat) => (
              <CategoryCard
                key={cat.id}
                category={cat}
                draggable
                selected={selected.has(cat.id)}
                onSelect={toggleSelect}
                onDragStart={setDragId}
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onEdit={(id) => {
                  setEditingId(id);
                  setFormOpen(true);
                }}
                onPreview={(id) => {
                  setPreviewId(id);
                  setPreviewOpen(true);
                }}
                onDuplicate={(id) => duplicateMutation.mutate(id)}
                onDelete={(id) => {
                  if (confirm('Delete this category?')) deleteMutation.mutate(id);
                }}
              />
            ))}
          </motion.div>
        ) : viewMode === 'table' ? (
          <motion.div key="table" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <CategoriesTable
              categories={categories}
              selected={selected}
              onSelect={toggleSelect}
              onSelectAll={() =>
                setSelected(
                  selected.size === categories.length
                    ? new Set()
                    : new Set(categories.map((c) => c.id)),
                )
              }
              onEdit={(id) => {
                setEditingId(id);
                setFormOpen(true);
              }}
              onPreview={(id) => {
                setPreviewId(id);
                setPreviewOpen(true);
              }}
              onDuplicate={(id) => duplicateMutation.mutate(id)}
              onDelete={(id) => {
                if (confirm('Delete?')) deleteMutation.mutate(id);
              }}
            />
          </motion.div>
        ) : (
          <motion.div key="kanban" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <CategoriesKanban
              categories={categories}
              onEdit={(id) => {
                setEditingId(id);
                setFormOpen(true);
              }}
              onPreview={(id) => {
                setPreviewId(id);
                setPreviewOpen(true);
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <CategoryFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        category={editingCategory}
        onSave={(data) => saveMutation.mutate(data)}
        saving={saveMutation.isPending}
      />

      <CategoryPreviewDialog
        category={previewCategory}
        open={previewOpen}
        onOpenChange={setPreviewOpen}
      />
    </div>
  );
}

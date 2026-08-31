'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Heart, MapPin, Plus, Trash2, RotateCcw, CheckCircle2 } from 'lucide-react';
import { Button, Card, CardContent, Badge } from '@mdh/ui';
import { formatCurrency, formatDate } from '@mdh/utils';
import type { InvoiceListItemDto, OrderDto, ProductDto, AddressDto } from '@mdh/types';
import { INVOICE_STATUS_LABELS } from '@mdh/types';
import { EmptyState } from './empty-state';
import { AddressFormDialog } from './address-form-dialog';
import { StatCard } from './stat-card';
import { getProductImage } from '@/lib/product-images';
import {
  getHeaderDisplayName,
  getLoyaltyTier,
  getRewardPoints,
  type DashboardSection,
} from './types';
import { RateOrderButton } from '@/components/reviews/review-form';
import { useCartStore } from '@/lib/cart-store';
import { api, API_URL } from '@/lib/api';
import { getAccessToken } from '@mdh/auth-client';
import { useToastStore } from '@/lib/toast-store';
import { useRouter } from 'next/navigation';

interface DashboardContentProps {
  section: DashboardSection;
  userName?: string | null;
  orders: OrderDto[];
  favorites: ProductDto[];
  addresses: AddressDto[];
  notifications: { id: string; title: string; body: string; createdAt: string }[];
  onSectionChange: (s: DashboardSection) => void;
}

export function DashboardOverview({
  userName,
  orders,
  favorites,
  addresses,
  onSectionChange,
}: Omit<DashboardContentProps, 'section' | 'notifications'>) {
  const orderCount = orders.length;
  const favoriteCount = favorites.length;
  const rewardPoints = getRewardPoints(orderCount, favoriteCount);
  const totalSaved = orders.reduce((sum, o) => sum + (o.discount || 0), 0);
  const tier = getLoyaltyTier(orderCount);
  const recentOrders = orders.slice(0, 3);

  const activity = useMemo(() => {
    const items: { text: string; time: string }[] = [];
    orders.slice(0, 3).forEach((o) => {
      const item = o.items[0];
      if (item) items.push({ text: `Ordered ${item.productName}`, time: o.createdAt });
    });
    favorites.slice(0, 1).forEach((f) => {
      items.push({ text: `Added ${f.name} to Favourites`, time: new Date().toISOString() });
    });
    return items.slice(0, 4);
  }, [orders, favorites]);

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon="📦" label="Total Orders" value={orderCount} index={0} />
        <StatCard icon="❤️" label="Favourite Items" value={favoriteCount} index={1} />
        <StatCard icon="🏆" label="Reward Points" value={rewardPoints} suffix=" pts" index={2} />
        <StatCard icon="💰" label="Saved" value={totalSaved || 0} prefix="₹" index={3} />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 rounded-2xl shadow-md border-0">
          <CardContent className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-bold text-[#14532D]">Recent Orders</h2>
              {orders.length > 0 && (
                <button
                  type="button"
                  onClick={() => onSectionChange('orders')}
                  className="text-sm text-primary font-medium hover:underline"
                >
                  View all
                </button>
              )}
            </div>
            {recentOrders.length === 0 ? (
              <EmptyState
                emoji="📦"
                title="No Orders Yet"
                description="Looks like you haven't ordered anything. Start with a crispy dosa!"
                actionLabel="Browse Menu"
                actionHref="/menu"
              />
            ) : (
              <div className="space-y-3">
                {recentOrders.map((order) => (
                  <OrderRow key={order.id} order={order} compact />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card
          className={`rounded-2xl shadow-lg border-0 bg-gradient-to-br ${tier.color} text-white overflow-hidden`}
        >
          <CardContent className="p-6">
            <p className="text-white/80 text-sm font-medium mb-1">{tier.label}</p>
            <p className="text-3xl font-bold mb-1">{rewardPoints}</p>
            <p className="text-white/90 text-sm mb-6">Reward Points</p>
            <Button className="w-full bg-white text-[#14532D] hover:bg-white/90 font-semibold">
              Redeem Now
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="rounded-2xl shadow-md border-0">
          <CardContent className="p-6">
            <h2 className="font-bold text-[#14532D] mb-4">Favourite Items</h2>
            {favorites.length === 0 ? (
              <EmptyState
                emoji="❤️"
                title="No Favourite Items"
                description="Save your favourite dosas and biryanis for quick reordering."
                actionLabel="Explore Menu"
                actionHref="/menu"
              />
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {favorites.slice(0, 4).map((p) => (
                  <FavoriteMiniCard key={p.id} product={p} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl shadow-md border-0">
          <CardContent className="p-6">
            <h2 className="font-bold text-[#14532D] mb-4">Recent Activity</h2>
            {activity.length === 0 ? (
              <p className="text-gray-500 text-sm">Your activity will appear here.</p>
            ) : (
              <ul className="space-y-3">
                {activity.map((a, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[#1F2937]">{a.text}</p>
                      <p className="text-xs text-gray-400">{formatDate(a.time)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function OrderRow({ order, compact }: { order: OrderDto; compact?: boolean }) {
  const addItem = useCartStore((s) => s.addItem);
  const toast = useToastStore((s) => s.show);
  const router = useRouter();
  const [reordering, setReordering] = useState(false);
  const firstItem = order.items[0];
  const statusColor =
    order.status === 'DELIVERED'
      ? 'success'
      : order.status === 'CANCELLED'
        ? 'destructive'
        : 'secondary';

  async function reorderAll() {
    setReordering(true);
    let added = 0;
    const skipped: string[] = [];
    try {
      for (const item of order.items) {
        try {
          const product = await api.get<ProductDto>(`/products/${item.productId}`);
          if (product.isAvailable === false) {
            skipped.push(item.productName);
            continue;
          }
          addItem(product, item.variantId ?? undefined, item.quantity);
          added += 1;
        } catch {
          skipped.push(item.productName);
        }
      }
      if (added > 0) {
        if (skipped.length) toast(`${skipped.length} item(s) unavailable and were skipped.`);
        else toast('Items added to your cart.');
        router.push('/cart');
      } else {
        toast('None of the items from this order are available right now.');
      }
    } finally {
      setReordering(false);
    }
  }

  return (
    <div className="flex items-center gap-4 p-3 rounded-xl bg-[#FFF8E8]/60 hover:bg-[#FFF8E8] transition-colors">
      <div className="relative w-14 h-14 rounded-xl overflow-hidden shrink-0 bg-gray-100">
        <Image src="/images/hero-dosa.png" alt="" fill sizes="56px" className="object-cover" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-[#1F2937] truncate">
          {firstItem?.productName || order.orderNumber}
        </p>
        <p className="text-sm text-primary font-bold">{formatCurrency(order.grandTotal)}</p>
        {!compact && <p className="text-xs text-gray-400">{formatDate(order.createdAt)}</p>}
      </div>
      <Badge variant={statusColor as 'success' | 'destructive' | 'secondary'}>
        {order.status.replace('_', ' ')}
      </Badge>
      {!compact && <RateOrderButton order={order} />}
      {!compact && (
        <Link href={`/track/${order.orderNumber}`}>
          <Button size="sm" variant="outline" className="shrink-0">
            Track
          </Button>
        </Link>
      )}
      <Button
        size="sm"
        className="shrink-0 bg-primary gap-1"
        disabled={reordering || !order.items.length}
        onClick={() => void reorderAll()}
      >
        <RotateCcw className="w-3 h-3" /> {reordering ? 'Adding…' : 'Reorder'}
      </Button>
    </div>
  );
}

function FavoriteMiniCard({ product }: { product: ProductDto }) {
  const addItem = useCartStore((s) => s.addItem);
  return (
    <div className="rounded-xl overflow-hidden bg-white border border-gray-100 shadow-sm card-lift">
      <div className="relative h-24">
        <Image
          src={getProductImage(product)}
          alt={product.name}
          fill
          sizes="96px"
          className="object-cover"
        />
      </div>
      <div className="p-2">
        <p className="text-xs font-bold truncate">{product.name}</p>
        <div className="flex justify-between items-center mt-1">
          <span className="text-xs font-bold text-primary">{formatCurrency(product.price)}</span>
          <button type="button" onClick={() => addItem(product)} aria-label="Add to cart">
            <Heart className="w-4 h-4 text-red-400 fill-red-400" />
          </button>
        </div>
      </div>
    </div>
  );
}

export function OrdersPanel({ orders }: { orders: OrderDto[] }) {
  if (!orders.length) {
    return (
      <EmptyState
        emoji="📦"
        title="No Orders Yet"
        description="Looks like you haven't ordered anything."
        actionLabel="Browse Menu"
        actionHref="/menu"
      />
    );
  }
  return (
    <div className="space-y-3">
      {orders.map((order) => (
        <Card key={order.id} className="rounded-2xl shadow-md border-0 card-lift">
          <CardContent className="p-4">
            <OrderRow order={order} />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function InvoicesPanel() {
  const toast = useToastStore((s) => s.show);
  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ['my-invoices'],
    queryFn: () => api.get<InvoiceListItemDto[]>('/invoices/mine'),
  });

  async function download(id: string, number: string) {
    try {
      const token = getAccessToken();
      const res = await fetch(`${API_URL}/invoices/mine/${id}/pdf`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!res.ok) throw new Error('Could not download invoice');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${number}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Download failed');
    }
  }

  if (isLoading) return <p className="text-sm text-gray-500">Loading invoices…</p>;
  if (!invoices.length) {
    return (
      <EmptyState
        emoji="🧾"
        title="No invoices yet"
        description="Invoices linked to your account will appear here."
        actionLabel="My Orders"
        actionHref="/dashboard?tab=orders"
      />
    );
  }
  return (
    <div className="space-y-3">
      {invoices.map((inv) => (
        <Card key={inv.id} className="rounded-2xl shadow-md border-0">
          <CardContent className="p-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-bold text-[#14532D]">{inv.invoiceNumber}</p>
              <p className="text-sm text-gray-500">{formatDate(inv.invoiceDate)}</p>
              <p className="text-xs mt-1">{INVOICE_STATUS_LABELS[inv.status]}</p>
            </div>
            <div className="text-right">
              <p className="font-bold">{formatCurrency(inv.grandTotal)}</p>
              <Button
                size="sm"
                variant="outline"
                className="mt-2"
                onClick={() => void download(inv.id, inv.invoiceNumber)}
              >
                Download Invoice
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function FavoritesPanel({ favorites }: { favorites: ProductDto[] }) {
  const addItem = useCartStore((s) => s.addItem);

  if (!favorites.length) {
    return (
      <EmptyState
        emoji="❤️"
        title="No Favourite Items"
        description="Tap the heart on any dish to save it here."
        actionLabel="Explore Menu"
        actionHref="/menu"
      />
    );
  }

  return (
    <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
      {favorites.map((product, i) => (
        <motion.div
          key={product.id}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
        >
          <Card className="rounded-2xl overflow-hidden shadow-md border-0 card-lift">
            <div className="relative h-40">
              <Image
                src={getProductImage(product)}
                alt={product.name}
                fill
                sizes="(max-width: 640px) 50vw, 320px"
                className="object-cover"
              />
            </div>
            <CardContent className="p-4">
              <h3 className="font-bold text-[#14532D]">{product.name}</h3>
              <p className="text-lg font-bold text-primary my-2">{formatCurrency(product.price)}</p>
              <div className="flex gap-2">
                <Link href={`/menu/${product.slug}`} className="flex-1">
                  <Button variant="outline" className="w-full" size="sm">
                    View
                  </Button>
                </Link>
                <Button size="sm" className="flex-1 bg-primary" onClick={() => addItem(product)}>
                  Add to Cart
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}

export function AddressesPanel({
  addresses,
  defaultContactName,
  defaultMobile,
}: {
  addresses: AddressDto[];
  defaultContactName?: string;
  defaultMobile?: string;
}) {
  const queryClient = useQueryClient();
  const toast = useToastStore((s) => s.show);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<AddressDto | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const saveMutation = useMutation({
    mutationFn: async ({
      values,
      addressId,
    }: {
      values: Omit<AddressDto, 'id'>;
      addressId?: string;
    }) => {
      if (addressId) {
        try {
          return await api.patch<AddressDto>(`/users/me/addresses/${addressId}`, values);
        } catch (err) {
          const message = err instanceof Error ? err.message : '';
          if (message.includes('Address not found')) {
            return api.post<AddressDto>('/users/me/addresses', values);
          }
          throw err;
        }
      }
      return api.post<AddressDto>('/users/me/addresses', values);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['my-addresses'] });
      setDialogOpen(false);
      toast(variables.addressId ? 'Address updated.' : 'Address saved successfully.');
      setEditingAddress(null);
    },
    onError: (err) => {
      toast(err instanceof Error ? err.message : 'Could not save address. Please try again.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/users/me/addresses/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-addresses'] });
      toast('Address removed.');
    },
    onError: () => {
      toast('Could not delete address. Please try again.');
    },
    onSettled: () => {
      setDeletingId(null);
    },
  });

  const openAddDialog = () => {
    setEditingAddress(null);
    setDialogOpen(true);
  };

  const openEditDialog = (addr: AddressDto) => {
    setEditingAddress(addr);
    setDialogOpen(true);
  };

  const handleDelete = (addr: AddressDto) => {
    if (!addr.id) return;
    if (!window.confirm('Remove this address?')) return;
    setDeletingId(addr.id);
    deleteMutation.mutate(addr.id);
  };

  return (
    <div className="space-y-4">
      {addresses.length === 0 ? (
        <EmptyState
          emoji="🏠"
          title="No Saved Addresses"
          description="Add your delivery address for faster checkout."
          actionLabel="Add Address"
          onAction={openAddDialog}
        />
      ) : (
        addresses.map((addr) => (
          <Card key={addr.id} className="rounded-2xl shadow-md border-0">
            <CardContent className="p-4 flex items-start gap-3">
              <MapPin className="w-5 h-5 text-secondary shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-bold text-[#14532D]">{addr.label || 'Home'}</p>
                  {addr.isDefault && (
                    <Badge className="bg-primary/10 text-primary text-xs">Default</Badge>
                  )}
                </div>
                <p className="text-sm font-medium text-gray-800 mt-0.5">
                  {addr.contactName} · +91 {addr.mobileNumber}
                </p>
                <p className="text-sm text-gray-600">
                  {addr.line1}
                  {addr.line2 ? `, ${addr.line2}` : ''}
                </p>
                <p className="text-sm text-gray-600">
                  {addr.landmark ? `${addr.landmark}, ` : ''}
                  {addr.city}, {addr.state} — {addr.pincode}
                </p>
                {addr.deliveryNotes && (
                  <p className="text-xs text-gray-400 mt-1 italic">{addr.deliveryNotes}</p>
                )}
              </div>
              <div className="flex flex-col gap-1 shrink-0">
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-[#14532D]"
                  onClick={() => openEditDialog(addr)}
                  aria-label="Edit address"
                >
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-red-600"
                  onClick={() => handleDelete(addr)}
                  disabled={deletingId === addr.id}
                  aria-label="Delete address"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))
      )}
      <Button
        variant="outline"
        className="gap-2 border-primary text-primary"
        onClick={openAddDialog}
      >
        <Plus className="w-4 h-4" /> Add New Address
      </Button>

      <AddressFormDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditingAddress(null);
        }}
        loading={saveMutation.isPending}
        initialValues={editingAddress}
        defaultContactName={defaultContactName}
        defaultMobile={defaultMobile}
        onSubmit={async (values, addressId) => {
          await saveMutation.mutateAsync({ values, addressId });
        }}
      />
    </div>
  );
}

export function CouponsPanel() {
  const { data: discounts = [], isLoading } = useQuery({
    queryKey: ['customer-discounts'],
    queryFn: () =>
      api.get<
        { id: string; name: string; code: string; type: string; value: number; discount: number }[]
      >('/coupons/available?subtotal=0'),
    staleTime: 30_000,
  });

  if (!isLoading && discounts.length === 0) {
    return (
      <EmptyState
        emoji="🏷️"
        title="No active discounts"
        description="Admin-created discounts will appear here when they are valid for your order."
        actionLabel="Browse Menu"
        actionHref="/menu"
      />
    );
  }

  return (
    <div className="grid sm:grid-cols-2 gap-4">
      {discounts.map((discount) => (
        <Card
          key={discount.id}
          className="rounded-2xl border-dashed border-secondary/50 bg-[#FFF8E8]"
        >
          <CardContent className="p-5">
            <Badge className="mb-2 bg-secondary text-[#1F2937]">Active discount</Badge>
            <p className="font-bold text-[#14532D]">{discount.name}</p>
            <p className="text-sm text-gray-500 mt-1">
              {discount.type === 'PERCENTAGE' ? `${discount.value}% off` : `₹${discount.value} off`}
            </p>
            <a
              href="/checkout"
              className="mt-4 inline-flex rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white"
            >
              View at Checkout
            </a>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function NotificationsPanel({
  notifications,
}: {
  notifications: { id: string; title: string; body: string; createdAt: string }[];
}) {
  if (!notifications.length) {
    return (
      <EmptyState
        emoji="🔔"
        title="No Notifications"
        description="Offers and order updates will appear here."
        actionLabel="Browse Offers"
        actionHref="/#offers"
      />
    );
  }
  return (
    <div className="space-y-3 max-h-96 overflow-y-auto">
      {notifications.map((n) => (
        <Card key={n.id} className="rounded-2xl border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="font-semibold text-[#14532D]">{n.title}</p>
            <p className="text-sm text-gray-600 mt-1">{n.body}</p>
            <p className="text-xs text-gray-400 mt-2">{formatDate(n.createdAt)}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function SettingsPanel({
  userName,
  phone,
}: {
  userName?: string | null;
  phone?: string | null;
}) {
  return (
    <Card className="rounded-2xl shadow-md border-0 max-w-lg">
      <CardContent className="p-6 space-y-4">
        <h2 className="font-bold text-[#14532D]">Account Settings</h2>
        <div>
          <label className="text-xs text-gray-500 font-medium">Display Name</label>
          <p className="font-semibold mt-1">{userName || '—'}</p>
        </div>
        <div>
          <label className="text-xs text-gray-500 font-medium">Phone</label>
          <p className="font-semibold mt-1">{phone || '—'}</p>
        </div>
        <p className="text-xs text-gray-400">Contact support to update your account details.</p>
      </CardContent>
    </Card>
  );
}

export function DashboardHeader({ userName }: { userName?: string | null }) {
  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
      <p className="text-secondary font-semibold text-sm mb-1">Welcome Back 👋</p>
      <h1 className="text-2xl md:text-3xl font-bold text-[#14532D]">
        {getHeaderDisplayName(userName) || 'Guest'}
      </h1>
      <p className="text-gray-500 mt-1">Enjoy your favourite South Indian meals.</p>
      <p className="text-xs text-gray-400 mt-2">{today}</p>
    </motion.div>
  );
}

'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Button, Badge, cn } from '@mdh/ui';
import { formatCurrency, ORDER_STATUS_LABELS } from '@mdh/utils';
import type { CustomerDetailDto } from '@mdh/types';
import { LoyaltyTier } from '@mdh/types';
import { api } from '@/lib/api';
import { useToastStore } from '@/lib/toast-store';
import {
  X,
  Phone,
  Mail,
  MapPin,
  Star,
  Gift,
  ShoppingBag,
  Heart,
  MessageSquare,
  Activity,
  StickyNote,
  Ban,
  RotateCcw,
} from 'lucide-react';

type Tab =
  | 'overview'
  | 'orders'
  | 'addresses'
  | 'rewards'
  | 'coupons'
  | 'favorites'
  | 'reviews'
  | 'activity'
  | 'notes';

const TABS: { id: Tab; label: string; icon: typeof Star }[] = [
  { id: 'overview', label: 'Overview', icon: Star },
  { id: 'orders', label: 'Orders', icon: ShoppingBag },
  { id: 'addresses', label: 'Addresses', icon: MapPin },
  { id: 'rewards', label: 'Rewards', icon: Gift },
  { id: 'coupons', label: 'Coupons', icon: Gift },
  { id: 'favorites', label: 'Favorites', icon: Heart },
  { id: 'reviews', label: 'Reviews', icon: MessageSquare },
  { id: 'activity', label: 'Activity', icon: Activity },
  { id: 'notes', label: 'Notes', icon: StickyNote },
];

const TIER_PROGRESS: Record<LoyaltyTier, number> = {
  [LoyaltyTier.BRONZE]: 25,
  [LoyaltyTier.SILVER]: 50,
  [LoyaltyTier.GOLD]: 75,
  [LoyaltyTier.PLATINUM]: 100,
};

interface CustomerDrawerProps {
  customer: CustomerDetailDto | null;
  open: boolean;
  onClose: () => void;
  onRefresh: () => void;
}

export function CustomerDrawer({ customer, open, onClose, onRefresh }: CustomerDrawerProps) {
  const [tab, setTab] = useState<Tab>('overview');
  const [noteText, setNoteText] = useState('');
  const [replyText, setReplyText] = useState<Record<string, string>>({});
  const toast = useToastStore((s) => s.show);

  const blockMutation = useMutation({
    mutationFn: (blocked: boolean) => api.patch(`/customers/${customer!.id}/block`, { blocked }),
    onSuccess: () => {
      toast('Customer status updated');
      onRefresh();
    },
  });

  const noteMutation = useMutation({
    mutationFn: (content: string) => api.post(`/customers/${customer!.id}/notes`, { content }),
    onSuccess: () => {
      toast('Note added');
      setNoteText('');
      onRefresh();
    },
  });

  const resetRewards = useMutation({
    mutationFn: () => api.post(`/customers/${customer!.id}/rewards/reset`),
    onSuccess: () => {
      toast('Rewards reset');
      onRefresh();
    },
  });

  const replyMutation = useMutation({
    mutationFn: ({ reviewId, reply }: { reviewId: string; reply: string }) =>
      api.patch(`/customers/reviews/${reviewId}/reply`, { reply }),
    onSuccess: () => {
      toast('Reply posted');
      onRefresh();
    },
  });

  if (!open) return null;

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 z-50 h-full w-full max-w-2xl bg-white dark:bg-gray-900 shadow-2xl flex flex-col"
          >
            {!customer ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="h-8 w-8 border-2 border-[#14532D] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <>
                {/* Header */}
                <div className="p-6 border-b shrink-0">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="h-16 w-16 rounded-2xl bg-[#14532D] text-white flex items-center justify-center text-xl font-bold">
                        {customer.name
                          .split(' ')
                          .map((n) => n[0])
                          .join('')
                          .slice(0, 2)}
                      </div>
                      <div>
                        <h2 className="text-xl font-bold">{customer.name}</h2>
                        <p className="text-sm text-muted-foreground">{customer.customerId}</p>
                        <div className="flex items-center gap-1 mt-1">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className={cn(
                                'h-3.5 w-3.5',
                                i < Math.min(5, Math.floor(customer.totalOrders / 3))
                                  ? 'fill-amber-400 text-amber-400'
                                  : 'text-gray-300',
                              )}
                            />
                          ))}
                          {customer.isVip && (
                            <Badge className="ml-2 bg-amber-100 text-amber-700 text-[10px]">
                              VIP
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={onClose}
                      className="p-2 rounded-lg hover:bg-muted"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-4 gap-3 mt-4">
                    {[
                      { label: 'Orders', value: customer.totalOrders },
                      { label: 'Spent', value: formatCurrency(customer.totalSpent) },
                      { label: 'Points', value: customer.rewardPoints },
                      { label: 'Avg Order', value: formatCurrency(customer.avgOrderValue) },
                    ].map((s) => (
                      <div key={s.label} className="rounded-lg bg-muted/50 p-2 text-center">
                        <p className="font-bold text-sm">{s.value}</p>
                        <p className="text-[10px] text-muted-foreground">{s.label}</p>
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-wrap gap-2 mt-4">
                    <Button size="sm" variant="outline" className="gap-1">
                      <MessageSquare className="h-3.5 w-3.5" /> Message
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1"
                      onClick={() => blockMutation.mutate(!customer.status.includes('Blocked'))}
                    >
                      <Ban className="h-3.5 w-3.5" />
                      {customer.status === 'Blocked' ? 'Unblock' : 'Block'}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1"
                      onClick={() => resetRewards.mutate()}
                    >
                      <RotateCcw className="h-3.5 w-3.5" /> Reset Rewards
                    </Button>
                  </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 px-4 pt-3 overflow-x-auto shrink-0 border-b pb-0">
                  {TABS.map(({ id, label, icon: Icon }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setTab(id)}
                      className={cn(
                        'flex items-center gap-1 px-3 py-2 text-xs font-semibold rounded-t-lg whitespace-nowrap transition-colors',
                        tab === id
                          ? 'bg-[#14532D] text-white'
                          : 'text-muted-foreground hover:bg-muted',
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {label}
                    </button>
                  ))}
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                  {tab === 'overview' && (
                    <div className="space-y-5">
                      <InfoRow icon={Phone} label="Phone" value={customer.phone ?? '—'} />
                      <InfoRow icon={Mail} label="Email" value={customer.email ?? '—'} />
                      <InfoRow
                        icon={MapPin}
                        label="Preferred Delivery"
                        value={customer.preferredDelivery ?? 'Delivery'}
                      />
                      <InfoRow
                        icon={Star}
                        label="Payment"
                        value={customer.preferredPayment ?? '—'}
                      />
                      <InfoRow
                        label="Registered"
                        value={new Date(customer.registeredDate).toLocaleDateString('en-IN')}
                      />
                      <InfoRow
                        label="Last Order"
                        value={
                          customer.lastOrderAt
                            ? new Date(customer.lastOrderAt).toLocaleDateString('en-IN')
                            : '—'
                        }
                      />

                      {customer.tags.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground mb-2">TAGS</p>
                          <div className="flex flex-wrap gap-1">
                            {customer.tags.map((t) => (
                              <Badge key={t} variant="outline">
                                {t}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Loyalty progress */}
                      <div className="rounded-xl border p-4">
                        <div className="flex justify-between mb-2">
                          <span className="text-sm font-semibold">
                            {customer.loyaltyTier} Member
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {customer.loyaltyProgress.orderCount} orders
                          </span>
                        </div>
                        <div className="h-2 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-[#14532D] to-[#F59E0B] transition-all"
                            style={{ width: `${TIER_PROGRESS[customer.loyaltyTier]}%` }}
                          />
                        </div>
                      </div>

                      {/* Timeline */}
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground mb-3">TIMELINE</p>
                        <div className="space-y-3 border-l-2 border-[#14532D]/30 pl-4 ml-2">
                          {customer.timeline.map((ev, i) => (
                            <div key={i} className="relative">
                              <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-[#14532D]" />
                              <p className="text-sm font-medium">{ev.description}</p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(ev.createdAt).toLocaleString('en-IN')}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {customer.adminNotes && (
                        <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 p-3 text-sm">
                          {customer.adminNotes}
                        </div>
                      )}
                    </div>
                  )}

                  {tab === 'orders' && (
                    <div className="space-y-3">
                      {customer.orders.length === 0 ? (
                        <p className="text-muted-foreground text-sm">No orders yet</p>
                      ) : (
                        customer.orders.map((o) => (
                          <div key={o.id} className="rounded-xl border p-4">
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <p className="font-semibold">#{o.orderNumber}</p>
                                <p className="text-xs text-muted-foreground">
                                  {new Date(o.createdAt).toLocaleString('en-IN')}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="font-bold">{formatCurrency(o.grandTotal)}</p>
                                <Badge variant="outline" className="text-[10px]">
                                  {ORDER_STATUS_LABELS[o.status] ?? o.status}
                                </Badge>
                              </div>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {o.items.map((i) => `${i.productName} ×${i.quantity}`).join(', ')}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">{o.paymentMethod}</p>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {tab === 'addresses' && (
                    <div className="space-y-3">
                      {(customer.addresses as Array<Record<string, unknown>>).length === 0 ? (
                        <p className="text-muted-foreground text-sm">No saved addresses</p>
                      ) : (
                        (customer.addresses as Array<Record<string, unknown>>).map((a, i) => (
                          <div key={i} className="rounded-xl border p-4">
                            <div className="flex justify-between mb-1">
                              <p className="font-semibold">
                                {String(a.contactName ?? a.label ?? 'Address')}
                              </p>
                              {a.isDefault ? <Badge className="text-[10px]">Default</Badge> : null}
                            </div>
                            <p className="text-sm">{String(a.mobileNumber ?? '')}</p>
                            <p className="text-sm text-muted-foreground mt-1">
                              {[a.line1, a.line2, a.landmark, a.city, a.state, a.pincode]
                                .filter(Boolean)
                                .join(', ')}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {tab === 'rewards' && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        {[
                          { label: 'Current', value: customer.rewards.current },
                          { label: 'Total Earned', value: customer.rewards.totalEarned },
                          { label: 'Redeemed', value: customer.rewards.totalRedeemed },
                          { label: 'Available', value: customer.rewards.available },
                        ].map((s) => (
                          <div key={s.label} className="rounded-xl bg-muted/50 p-3 text-center">
                            <p className="text-2xl font-bold text-[#F59E0B]">{s.value}</p>
                            <p className="text-xs text-muted-foreground">{s.label}</p>
                          </div>
                        ))}
                      </div>
                      <div className="space-y-2">
                        {customer.rewards.transactions.map((t) => (
                          <div key={t.id} className="flex justify-between text-sm border-b pb-2">
                            <div>
                              <p>{t.description ?? t.type}</p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(t.createdAt).toLocaleDateString('en-IN')}
                              </p>
                            </div>
                            <span
                              className={cn(
                                'font-bold',
                                t.points >= 0 ? 'text-emerald-600' : 'text-red-600',
                              )}
                            >
                              {t.points >= 0 ? '+' : ''}
                              {t.points}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {tab === 'coupons' && (
                    <div className="space-y-3">
                      {customer.coupons.length === 0 ? (
                        <p className="text-muted-foreground text-sm">No coupons assigned</p>
                      ) : (
                        customer.coupons.map((c) => (
                          <div key={c.id} className="rounded-xl border p-4 flex justify-between">
                            <div>
                              <p className="font-mono font-bold">{c.code}</p>
                              <p className="text-sm text-muted-foreground">
                                {c.type} — {c.value}
                              </p>
                            </div>
                            <Badge
                              className={
                                c.status === 'Used'
                                  ? 'bg-gray-100'
                                  : 'bg-emerald-100 text-emerald-700'
                              }
                            >
                              {c.status}
                            </Badge>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {tab === 'favorites' && (
                    <div className="space-y-2">
                      {customer.favorites.length === 0 ? (
                        <p className="text-muted-foreground text-sm">No favorites</p>
                      ) : (
                        customer.favorites.map((f) => (
                          <div
                            key={f.id}
                            className="flex justify-between items-center rounded-xl border p-3"
                          >
                            <p className="font-medium">{f.name}</p>
                            <span className="text-sm text-muted-foreground">
                              {f.orderCount} orders
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {tab === 'reviews' && (
                    <div className="space-y-4">
                      {customer.reviews.length === 0 ? (
                        <p className="text-muted-foreground text-sm">No reviews</p>
                      ) : (
                        customer.reviews.map((r) => (
                          <div key={r.id} className="rounded-xl border p-4">
                            <div className="flex justify-between mb-1">
                              <p className="font-semibold">{r.productName}</p>
                              <div className="flex">
                                {Array.from({ length: r.rating }).map((_, i) => (
                                  <Star
                                    key={i}
                                    className="h-3.5 w-3.5 fill-amber-400 text-amber-400"
                                  />
                                ))}
                              </div>
                            </div>
                            <p className="text-sm">{r.comment}</p>
                            {r.ownerReply && (
                              <p className="text-sm text-[#14532D] mt-2 pl-3 border-l-2">
                                {r.ownerReply}
                              </p>
                            )}
                            {!r.ownerReply && (
                              <div className="mt-2 flex gap-2">
                                <input
                                  className="flex-1 text-sm border rounded-lg px-2 py-1"
                                  placeholder="Write a reply…"
                                  value={replyText[r.id] ?? ''}
                                  onChange={(e) =>
                                    setReplyText((p) => ({ ...p, [r.id]: e.target.value }))
                                  }
                                />
                                <Button
                                  size="sm"
                                  onClick={() =>
                                    replyMutation.mutate({ reviewId: r.id, reply: replyText[r.id] })
                                  }
                                >
                                  Reply
                                </Button>
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {tab === 'activity' && (
                    <div className="space-y-2">
                      {customer.timeline.map((ev, i) => (
                        <div key={i} className="flex gap-3 text-sm border-b pb-2">
                          <Badge variant="outline" className="text-[10px] shrink-0">
                            {ev.type}
                          </Badge>
                          <div>
                            <p>{ev.description}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(ev.createdAt).toLocaleString('en-IN')}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {tab === 'notes' && (
                    <div className="space-y-4">
                      <div className="flex gap-2">
                        <input
                          className="flex-1 border rounded-xl px-3 py-2 text-sm"
                          placeholder="Add internal note…"
                          value={noteText}
                          onChange={(e) => setNoteText(e.target.value)}
                        />
                        <Button
                          size="sm"
                          className="bg-[#14532D]"
                          onClick={() => noteText && noteMutation.mutate(noteText)}
                        >
                          Add
                        </Button>
                      </div>
                      {customer.notes.map((n) => (
                        <div key={n.id} className="rounded-xl bg-muted/50 p-3 text-sm">
                          <p>{n.content}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(n.createdAt).toLocaleString('en-IN')}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon?: typeof Phone;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3">
      {Icon && <Icon className="h-4 w-4 text-muted-foreground shrink-0" />}
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium">{value}</p>
      </div>
    </div>
  );
}

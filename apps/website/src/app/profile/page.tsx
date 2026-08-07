'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';
import { Button, Card, CardContent } from '@mdh/ui';
import { formatCurrency, formatDate } from '@mdh/utils';
import { getStoredUser, isAuthenticated, logout } from '@mdh/auth-client';
import { api, API_URL } from '@/lib/api';

export default function ProfilePage() {
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated()) router.push('/login');
  }, [router]);

  const user = getStoredUser();

  const { data: orders } = useQuery({
    queryKey: ['my-orders'],
    queryFn: () => api.get<unknown[]>('/users/me/orders'),
    enabled: isAuthenticated(),
  });

  const { data: favorites } = useQuery({
    queryKey: ['my-favorites'],
    queryFn: () => api.get<{ id: string; name: string; price: number }[]>('/users/me/favorites'),
    enabled: isAuthenticated(),
  });

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-primary">My Profile</h1>
        <Button
          variant="outline"
          onClick={async () => {
            await logout(API_URL);
            router.push('/');
          }}
        >
          Logout
        </Button>
      </div>

      <Card className="mb-6">
        <CardContent className="p-4">
          <p className="font-semibold">{user?.name}</p>
          <p className="text-sm text-muted-foreground">{user?.phone || user?.email}</p>
        </CardContent>
      </Card>

      <section className="mb-8">
        <h2 className="font-semibold mb-4">Order History</h2>
        {orders?.length ? (
          <div className="space-y-3">
            {(
              orders as { id: string; orderNumber: string; grandTotal: number; createdAt: string }[]
            ).map((o) => (
              <Card key={o.id}>
                <CardContent className="p-4 flex justify-between">
                  <div>
                    <p className="font-medium">{o.orderNumber}</p>
                    <p className="text-sm text-muted-foreground">{formatDate(o.createdAt)}</p>
                  </div>
                  <Link href={`/track/${o.orderNumber}`}>
                    <Button size="sm" variant="outline">
                      {formatCurrency(o.grandTotal)}
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground">No orders yet</p>
        )}
      </section>

      <section>
        <h2 className="font-semibold mb-4">Favorites</h2>
        {favorites?.length ? (
          <div className="space-y-2">
            {favorites.map((f) => (
              <Link key={f.id} href={`/menu/${f.id}`} className="block">
                <Card>
                  <CardContent className="p-3">
                    {f.name} — {formatCurrency(f.price)}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground">No favorites yet</p>
        )}
      </section>
    </div>
  );
}

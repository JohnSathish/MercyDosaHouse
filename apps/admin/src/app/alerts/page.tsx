'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function OrderAlertsRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/notifications');
  }, [router]);
  return <p className="text-sm text-muted-foreground">Opening notifications…</p>;
}

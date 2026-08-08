'use client';

import { useQuery } from '@tanstack/react-query';
import { Map } from 'lucide-react';
import { motion } from 'framer-motion';
import { api } from '@/lib/api';
import type { DeliveryDashboardDto } from '@mdh/types';

export default function DeliveryMapPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['delivery-dashboard'],
    queryFn: () => api.get<DeliveryDashboardDto>('/delivery/dashboard'),
    refetchInterval: 15_000,
  });

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Map className="h-6 w-6 text-[#14532D]" />
          Map View
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Full-screen delivery map with restaurant, riders, and customer locations
        </p>
      </div>

      {apiKey ? (
        <div className="rounded-xl border overflow-hidden shadow-sm h-[500px]">
          <iframe
            title="Delivery Map"
            width="100%"
            height="100%"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            src={`https://www.google.com/maps/embed/v1/view?key=${apiKey}&center=25.5133,90.2036&zoom=14&maptype=roadmap`}
          />
        </div>
      ) : (
        <div className="relative rounded-xl border bg-white dark:bg-gray-900 overflow-hidden shadow-sm h-[500px]">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-100 via-teal-50 to-cyan-100 dark:from-gray-800 dark:to-gray-900">
            <div className="absolute inset-0 opacity-20 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTAgMGg0MHY0MEgweiIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjMTQ1MzJEMiIgc3Ryb2tlLW9wYWNpdHk9IjAuMSIvPjwvc3ZnPg==')]" />
          </div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
            <Map className="h-12 w-12 text-[#14532D] mx-auto mb-3 opacity-50" />
            <p className="text-sm text-muted-foreground max-w-xs">
              Set{' '}
              <code className="text-xs bg-muted px-1 rounded">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code>{' '}
              for live Google Maps
            </p>
          </div>
          {!isLoading &&
            data?.liveRiders.map((r, i) => (
              <motion.div
                key={r.id}
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ repeat: Infinity, duration: 2 + i * 0.5 }}
                className="absolute h-4 w-4 rounded-full bg-[#14532D] ring-2 ring-white shadow-lg"
                style={{ left: `${20 + i * 20}%`, top: `${30 + i * 10}%` }}
                title={r.name ?? 'Rider'}
              />
            ))}
          <div
            className="absolute h-6 w-6 rounded-full bg-red-500 ring-2 ring-white shadow-lg flex items-center justify-center text-white text-xs"
            style={{ left: '48%', top: '45%' }}
            title="Restaurant"
          >
            🍽
          </div>
        </div>
      )}

      <div className="grid sm:grid-cols-3 gap-3 text-sm">
        <div className="rounded-lg border p-3 bg-white dark:bg-gray-900">
          <p className="font-semibold">Restaurant</p>
          <p className="text-muted-foreground text-xs">Mercy Dosa House, Tura</p>
        </div>
        <div className="rounded-lg border p-3 bg-white dark:bg-gray-900">
          <p className="font-semibold">Active Riders</p>
          <p className="text-2xl font-bold text-[#14532D]">{data?.stats.onlineRiders ?? 0}</p>
        </div>
        <div className="rounded-lg border p-3 bg-white dark:bg-gray-900">
          <p className="font-semibold">On The Way</p>
          <p className="text-2xl font-bold text-purple-600">{data?.stats.onTheWay ?? 0}</p>
        </div>
      </div>
    </div>
  );
}

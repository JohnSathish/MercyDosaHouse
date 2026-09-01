import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { io } from 'socket.io-client';
import { SOCKET_IO_CLIENT_OPTIONS } from '@mdh/utils';
import { getAccessToken } from '@mdh/auth-client';
import type { DeliveryDashboardDto, DeliveryOrderDto } from '@mdh/types';

type DeliveryLocationEvent = {
  orderId: string;
  staffId?: string | null;
  latitude: number;
  longitude: number;
  accuracyMeters?: number | null;
  updatedAt: string;
  distanceKm?: number | null;
  etaMinutes?: number | null;
  routePolyline?: string | null;
};

type OrderUpdateEvent = {
  orderId: string;
  status?: string;
  trackingStatus?: string;
  message?: string;
};

function updateOrderList(
  current: DeliveryOrderDto[] | undefined,
  event: DeliveryLocationEvent,
): DeliveryOrderDto[] | undefined {
  if (!current) return current;
  return current.map((order) => {
    if (order.id !== event.orderId || !order.assignment) return order;
    return {
      ...order,
      assignment: {
        ...order.assignment,
        latitude: event.latitude,
        longitude: event.longitude,
        lastLocationAt: event.updatedAt,
        locationAccuracyMeters:
          event.accuracyMeters ?? order.assignment.locationAccuracyMeters ?? null,
        distanceKm: event.distanceKm ?? order.assignment.distanceKm,
        etaMinutes: event.etaMinutes ?? order.assignment.etaMinutes,
        routePolyline: event.routePolyline ?? order.assignment.routePolyline,
      },
    };
  });
}

export function useDeliveryLiveUpdates(orderIds: string[]) {
  const queryClient = useQueryClient();
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const orderIdKey = [...new Set(orderIds)].sort().join(',');

  useEffect(() => {
    const token = getAccessToken();
    const ids = orderIdKey.split(',').filter(Boolean);
    if (!token || !ids.length) {
      setConnected(false);
      return;
    }

    const apiUrl =
      process.env.NEXT_PUBLIC_API_URL?.replace(/\/api\/v1\/?$/, '') || 'http://localhost:3001';
    const socket = io(`${apiUrl}/orders`, {
      ...SOCKET_IO_CLIENT_OPTIONS,
      auth: { token },
      reconnection: true,
    });

    const subscribe = () => {
      setConnected(true);
      setError(null);
      ids.forEach((orderId) => socket.emit('subscribe', orderId));
    };
    const handleDisconnect = () => setConnected(false);
    const handleDenied = (payload: { reason?: string }) => {
      setError(payload.reason || 'Live delivery subscription was denied');
    };
    const handleLocation = (event: DeliveryLocationEvent) => {
      queryClient.setQueryData<DeliveryOrderDto[]>(['delivery-active'], (current) =>
        updateOrderList(current, event),
      );
      queryClient.setQueryData<DeliveryOrderDto[]>(['delivery-map-active'], (current) =>
        updateOrderList(current, event),
      );
      queryClient.setQueryData<DeliveryDashboardDto>(['delivery-dashboard'], (current) => {
        if (!current || !event.staffId) return current;
        return {
          ...current,
          pendingOrders: updateOrderList(current.pendingOrders, event) ?? current.pendingOrders,
          liveRiders: current.liveRiders.map((rider) =>
            rider.id === event.staffId
              ? { ...rider, lat: event.latitude, lng: event.longitude }
              : rider,
          ),
          executives: current.executives.map((rider) =>
            rider.id === event.staffId
              ? { ...rider, currentLat: event.latitude, currentLng: event.longitude }
              : rider,
          ),
        };
      });
    };
    const handleOrderUpdate = (event: OrderUpdateEvent) => {
      void queryClient.invalidateQueries({ queryKey: ['delivery-active'] });
      void queryClient.invalidateQueries({ queryKey: ['delivery-map-active'] });
      void queryClient.invalidateQueries({ queryKey: ['delivery-dashboard'] });
      if (event.orderId) {
        void queryClient.invalidateQueries({ queryKey: ['delivery-order', event.orderId] });
      }
    };
    const handleNewOrder = () => {
      void queryClient.invalidateQueries({ queryKey: ['delivery-dashboard'] });
    };

    socket.on('connect', subscribe);
    socket.on('disconnect', handleDisconnect);
    socket.on('subscriptionDenied', handleDenied);
    socket.on('deliveryLocation', handleLocation);
    socket.on('orderUpdate', handleOrderUpdate);
    socket.on('newOrder', handleNewOrder);
    if (socket.connected) subscribe();

    return () => {
      socket.off('connect', subscribe);
      socket.off('disconnect', handleDisconnect);
      socket.off('subscriptionDenied', handleDenied);
      socket.off('deliveryLocation', handleLocation);
      socket.off('orderUpdate', handleOrderUpdate);
      socket.off('newOrder', handleNewOrder);
      socket.disconnect();
      setConnected(false);
    };
  }, [orderIdKey, queryClient]);

  return { connected, error };
}

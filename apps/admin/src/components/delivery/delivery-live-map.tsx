'use client';

import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import {
  Circle,
  CircleMarker,
  MapContainer,
  Polyline,
  TileLayer,
  Tooltip,
  useMap,
} from 'react-leaflet';
import L from 'leaflet';
import { MapPinned, Satellite, Scan } from 'lucide-react';
import { Button } from '@mdh/ui';
import type { DeliveryOrderDto } from '@mdh/types';

type MapType = 'standard' | 'satellite';

type DeliveryLiveMapProps = {
  orders: DeliveryOrderDto[];
  mapType?: MapType;
  onMapTypeChange?: (mapType: MapType) => void;
  selectedOrderId?: string | null;
  onSelectOrder?: (orderId: string) => void;
};

type Point = {
  latitude: number;
  longitude: number;
};

function decodePolyline(encoded: string): Point[] {
  const points: Point[] = [];
  let index = 0;
  let latitude = 0;
  let longitude = 0;

  while (index < encoded.length) {
    let shift = 0;
    let result = 0;
    let byte: number;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20 && index < encoded.length);
    latitude += result & 1 ? ~(result >> 1) : result >> 1;

    shift = 0;
    result = 0;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20 && index < encoded.length);
    longitude += result & 1 ? ~(result >> 1) : result >> 1;

    points.push({ latitude: latitude / 100000, longitude: longitude / 100000 });
  }

  return points;
}

function AnimatedAgentMarker({
  point,
  orderNumber,
  selected,
  onClick,
}: {
  point: Point;
  orderNumber: string;
  selected: boolean;
  onClick?: () => void;
}) {
  const [position, setPosition] = useState(point);
  const previous = useRef(point);

  useEffect(() => {
    const from = previous.current;
    const startedAt = performance.now();
    const duration = 650;
    let frame = 0;

    const animate = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / duration);
      const eased = 1 - (1 - progress) ** 3;
      setPosition({
        latitude: from.latitude + (point.latitude - from.latitude) * eased,
        longitude: from.longitude + (point.longitude - from.longitude) * eased,
      });
      if (progress < 1) frame = requestAnimationFrame(animate);
    };

    frame = requestAnimationFrame(animate);
    previous.current = point;
    return () => cancelAnimationFrame(frame);
  }, [point]);

  return (
    <CircleMarker
      center={[position.latitude, position.longitude]}
      radius={selected ? 11 : 9}
      pathOptions={{
        color: '#FFFFFF',
        weight: 3,
        fillColor: '#14532D',
        fillOpacity: 1,
      }}
      eventHandlers={{ click: onClick }}
    >
      <Tooltip direction="top" offset={[0, -8]} permanent={selected}>
        <strong>{orderNumber}</strong>
        <br />
        Delivery agent
      </Tooltip>
    </CircleMarker>
  );
}

function MapViewport({
  points,
  fitKey,
  selectedPoint,
}: {
  points: Point[];
  fitKey: string;
  selectedPoint?: Point;
}) {
  const map = useMap();
  const pointsRef = useRef(points);

  useEffect(() => {
    pointsRef.current = points;
  }, [points]);

  useEffect(() => {
    if (!pointsRef.current.length) return;
    map.fitBounds(
      L.latLngBounds(
        pointsRef.current.map((point) => [point.latitude, point.longitude] as [number, number]),
      ),
      { padding: [48, 48], maxZoom: 15 },
    );
  }, [fitKey, map]);

  useEffect(() => {
    if (selectedPoint) {
      map.flyTo([selectedPoint.latitude, selectedPoint.longitude], Math.max(map.getZoom(), 15), {
        duration: 0.6,
      });
    }
  }, [map, selectedPoint]);

  return null;
}

function MapControls({
  orders,
  mapType,
  onMapTypeChange,
}: {
  orders: DeliveryOrderDto[];
  mapType: MapType;
  onMapTypeChange: (mapType: MapType) => void;
}) {
  const map = useMap();
  const allPoints = orders.flatMap((order) => {
    const points: Point[] = [];
    if (order.assignment?.latitude != null && order.assignment.longitude != null) {
      points.push({
        latitude: order.assignment.latitude,
        longitude: order.assignment.longitude,
      });
    }
    if (order.deliveryLatitude != null && order.deliveryLongitude != null) {
      points.push({ latitude: order.deliveryLatitude, longitude: order.deliveryLongitude });
    }
    return points;
  });

  const fitAll = () => {
    if (!allPoints.length) return;
    map.fitBounds(
      L.latLngBounds(
        allPoints.map((point) => [point.latitude, point.longitude] as [number, number]),
      ),
      { padding: [48, 48], maxZoom: 15 },
    );
  };

  return (
    <div className="absolute right-3 top-3 z-[1000] flex flex-col gap-2">
      <Button
        size="sm"
        variant="outline"
        className="bg-white/95 shadow-md"
        onClick={fitAll}
        title="Fit all deliveries"
      >
        <Scan className="mr-1.5 h-4 w-4" /> Fit all
      </Button>
      <Button
        size="sm"
        variant="outline"
        className="bg-white/95 shadow-md"
        onClick={() => onMapTypeChange(mapType === 'standard' ? 'satellite' : 'standard')}
        title="Change map type"
      >
        {mapType === 'standard' ? (
          <Satellite className="mr-1.5 h-4 w-4" />
        ) : (
          <MapPinned className="mr-1.5 h-4 w-4" />
        )}
        {mapType === 'standard' ? 'Satellite' : 'Standard'}
      </Button>
    </div>
  );
}

export function DeliveryLiveMap({
  orders,
  mapType = 'standard',
  onMapTypeChange,
  selectedOrderId,
  onSelectOrder,
}: DeliveryLiveMapProps) {
  const fitKey = orders
    .map((order) => order.id)
    .sort()
    .join(',');
  const positions = useMemo(
    () =>
      orders.flatMap((order) => {
        const points: Point[] = [];
        if (order.assignment?.latitude != null && order.assignment.longitude != null) {
          points.push({
            latitude: order.assignment.latitude,
            longitude: order.assignment.longitude,
          });
        }
        if (order.deliveryLatitude != null && order.deliveryLongitude != null) {
          points.push({ latitude: order.deliveryLatitude, longitude: order.deliveryLongitude });
        }
        return points;
      }),
    [orders],
  );
  const selectedPoint = useMemo(() => {
    const order = orders.find((item) => item.id === selectedOrderId);
    if (
      !order?.assignment ||
      order.assignment.latitude == null ||
      order.assignment.longitude == null
    ) {
      return undefined;
    }
    return { latitude: order.assignment.latitude, longitude: order.assignment.longitude };
  }, [orders, selectedOrderId]);

  if (!orders.length || !positions.length) return null;
  const initialPoint = positions[0];

  return (
    <div className="relative h-full min-h-[360px] overflow-hidden rounded-xl">
      <MapContainer
        center={[initialPoint.latitude, initialPoint.longitude]}
        zoom={14}
        className="h-full min-h-[360px] w-full"
      >
        <TileLayer
          attribution={
            mapType === 'standard'
              ? '&copy; OpenStreetMap contributors'
              : '&copy; Esri, Maxar, Earthstar Geographics'
          }
          url={
            mapType === 'standard'
              ? 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
              : 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
          }
        />
        <MapViewport points={positions} fitKey={fitKey} selectedPoint={selectedPoint} />
        <MapControls
          orders={orders}
          mapType={mapType}
          onMapTypeChange={onMapTypeChange ?? (() => undefined)}
        />
        {orders.map((order) => {
          const agent =
            order.assignment?.latitude != null && order.assignment.longitude != null
              ? { latitude: order.assignment.latitude, longitude: order.assignment.longitude }
              : null;
          const customer =
            order.deliveryLatitude != null && order.deliveryLongitude != null
              ? { latitude: order.deliveryLatitude, longitude: order.deliveryLongitude }
              : null;
          const route =
            order.assignment?.routePolyline && order.assignment.routePolyline.length > 0
              ? decodePolyline(order.assignment.routePolyline)
              : agent && customer
                ? [agent, customer]
                : [];
          const selected = selectedOrderId === order.id;

          return (
            <Fragment key={order.id}>
              {route.length > 1 && (
                <Polyline
                  positions={route.map(
                    (point) => [point.latitude, point.longitude] as [number, number],
                  )}
                  pathOptions={{
                    color: selected ? '#F59E0B' : '#14532D',
                    weight: selected ? 6 : 4,
                    opacity: selected ? 0.9 : 0.65,
                    dashArray: order.assignment?.routePolyline ? undefined : '8 8',
                  }}
                />
              )}
              {agent && (
                <>
                  <AnimatedAgentMarker
                    point={agent}
                    orderNumber={order.orderNumber}
                    selected={selected}
                    onClick={() => onSelectOrder?.(order.id)}
                  />
                  {order.assignment?.locationAccuracyMeters ? (
                    <Circle
                      center={[agent.latitude, agent.longitude]}
                      radius={order.assignment.locationAccuracyMeters}
                      pathOptions={{ color: '#14532D', fillOpacity: 0.08, weight: 1 }}
                    />
                  ) : null}
                </>
              )}
              {customer && (
                <CircleMarker
                  center={[customer.latitude, customer.longitude]}
                  radius={selected ? 10 : 8}
                  pathOptions={{
                    color: '#FFFFFF',
                    weight: 2,
                    fillColor: '#F59E0B',
                    fillOpacity: 1,
                  }}
                  eventHandlers={{ click: () => onSelectOrder?.(order.id) }}
                >
                  <Tooltip direction="top" offset={[0, -8]} permanent={selected}>
                    <strong>{order.orderNumber}</strong>
                    <br />
                    Customer destination
                  </Tooltip>
                </CircleMarker>
              )}
            </Fragment>
          );
        })}
      </MapContainer>
      <div className="pointer-events-none absolute bottom-3 left-3 z-[1000] rounded-lg bg-white/95 px-3 py-2 text-xs shadow-md">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-[#14532D]">Live deliveries</span>
          <span className="text-muted-foreground">{orders.length}</span>
        </div>
        <div className="mt-1 flex gap-3 text-muted-foreground">
          <span>Agent GPS</span>
          <span>Customer pin</span>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { CircleMarker, MapContainer, Polyline, TileLayer, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import type { LiveDeliveryLocationDto } from '@mdh/types';

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
    let result = 0;
    let shift = 0;
    let byte: number;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20 && index < encoded.length);
    latitude += result & 1 ? ~(result >> 1) : result >> 1;

    result = 0;
    shift = 0;
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

function AnimatedMarker({
  point,
  type,
  label,
}: {
  point: Point;
  type: 'agent' | 'customer';
  label: string;
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
      radius={type === 'agent' ? 10 : 8}
      pathOptions={{
        color: '#FFFFFF',
        weight: 3,
        fillColor: type === 'agent' ? '#14532D' : '#F59E0B',
        fillOpacity: 1,
      }}
    >
      <Tooltip direction="top" offset={[0, -8]} permanent>
        <strong>{type === 'agent' ? 'Delivery partner' : 'Your delivery location'}</strong>
        <br />
        {label}
      </Tooltip>
    </CircleMarker>
  );
}

function FitDeliveryBounds({ points }: { points: Point[] }) {
  const map = useMap();
  const pointsRef = useRef(points);

  useEffect(() => {
    pointsRef.current = points;
  }, [points]);

  useEffect(() => {
    if (pointsRef.current.length < 2) return;
    map.fitBounds(
      L.latLngBounds(pointsRef.current.map((point) => [point.latitude, point.longitude])),
      { padding: [32, 32], maxZoom: 15 },
    );
  }, [map, points.length]);

  return null;
}

export function LiveDeliveryMap({ data }: { data: LiveDeliveryLocationDto }) {
  const agent =
    data.agent?.latitude != null && data.agent.longitude != null
      ? { latitude: data.agent.latitude, longitude: data.agent.longitude }
      : null;
  const customer =
    data.customer.latitude != null && data.customer.longitude != null
      ? { latitude: data.customer.latitude, longitude: data.customer.longitude }
      : null;
  const route = useMemo(
    () => (data.routePolyline ? decodePolyline(data.routePolyline) : []),
    [data.routePolyline],
  );
  const points = useMemo(
    () => [agent, customer].filter((point): point is Point => Boolean(point)),
    [agent?.latitude, agent?.longitude, customer?.latitude, customer?.longitude],
  );

  if (!points.length) return null;
  const initialPoint = points[0];

  return (
    <div className="h-64 w-full overflow-hidden bg-[#FFF8E8]">
      <MapContainer
        center={[initialPoint.latitude, initialPoint.longitude]}
        zoom={14}
        className="h-full w-full"
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitDeliveryBounds points={[...points, ...route]} />
        {route.length > 1 ? (
          <Polyline
            positions={route.map((point) => [point.latitude, point.longitude] as [number, number])}
            pathOptions={{ color: '#14532D', weight: 5, opacity: 0.8 }}
          />
        ) : null}
        {agent ? (
          <AnimatedMarker point={agent} type="agent" label={data.agent?.name ?? 'Live GPS'} />
        ) : null}
        {customer ? (
          <CircleMarker
            center={[customer.latitude, customer.longitude]}
            radius={8}
            pathOptions={{ color: '#FFFFFF', weight: 2, fillColor: '#F59E0B', fillOpacity: 1 }}
          >
            <Tooltip direction="top" offset={[0, -8]} permanent>
              <strong>Your delivery location</strong>
            </Tooltip>
          </CircleMarker>
        ) : null}
      </MapContainer>
    </div>
  );
}

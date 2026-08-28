'use client';

import { useEffect } from 'react';
import { MapContainer, Marker, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';

const deliveryIcon = L.divIcon({
  className: 'mdh-location-marker',
  html: '<span style="display:flex;align-items:center;justify-content:center;width:34px;height:34px;border:2px solid white;border-radius:50%;background:#F59E0B;box-shadow:0 2px 8px #0005;font-size:18px">📍</span>',
  iconSize: [34, 34],
  iconAnchor: [17, 17],
});

function FollowPoint({ latitude, longitude }: { latitude: number; longitude: number }) {
  const map = useMap();

  useEffect(() => {
    map.flyTo([latitude, longitude], Math.max(map.getZoom(), 16), { duration: 0.5 });
  }, [latitude, longitude, map]);

  return null;
}

export function LocationPickerMap({
  latitude,
  longitude,
  onChange,
}: {
  latitude: number;
  longitude: number;
  onChange: (latitude: number, longitude: number) => void;
}) {
  return (
    <div className="h-40 w-full overflow-hidden rounded-xl border">
      <MapContainer
        center={[latitude, longitude]}
        zoom={16}
        className="h-full w-full"
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FollowPoint latitude={latitude} longitude={longitude} />
        <Marker
          position={[latitude, longitude]}
          icon={deliveryIcon}
          draggable
          eventHandlers={{
            dragend: (event) => {
              const point = event.target.getLatLng();
              onChange(point.lat, point.lng);
            },
          }}
        />
      </MapContainer>
    </div>
  );
}

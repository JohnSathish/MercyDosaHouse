export type OsmMapPoint = {
  id: string;
  latitude: number;
  longitude: number;
  label?: string;
  type?: 'agent' | 'customer' | 'restaurant';
};

export type OsmMapHtmlOptions = {
  points: OsmMapPoint[];
  route?: Array<{ latitude: number; longitude: number }>;
  interactive?: boolean;
};

function escapeJson(value: unknown) {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

export function buildOsmMapHtml({ points, route = [], interactive = false }: OsmMapHtmlOptions) {
  const payload = escapeJson({ points, route, interactive });
  return `<!doctype html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
    <style>
      html, body, #map { height: 100%; margin: 0; background: #fff8e8; }
      .leaflet-control-attribution { font-size: 9px; }
      .marker { align-items: center; border: 2px solid white; border-radius: 50%; box-shadow: 0 2px 8px #0005; display: flex; height: 34px; justify-content: center; width: 34px; }
      .agent { background: #14532d; }
      .customer { background: #f59e0b; }
      .restaurant { background: #7c3aed; }
    </style>
  </head>
  <body>
    <div id="map"></div>
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <script>
      const payload = ${payload};
      const points = payload.points || [];
      const route = payload.route || [];
      const first = points[0] || { latitude: 25.514, longitude: 90.203 };
      const map = L.map('map', { zoomControl: true }).setView([first.latitude, first.longitude], 14);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19
      }).addTo(map);

      const bounds = [];
      points.forEach((point) => {
        const position = [point.latitude, point.longitude];
        bounds.push(position);
        const type = point.type || 'customer';
        const icon = L.divIcon({
          className: '',
          html: '<div class="marker ' + type + '">' + (type === 'agent' ? '🛵' : type === 'restaurant' ? '🍽️' : '📍') + '</div>',
          iconSize: [34, 34],
          iconAnchor: [17, 17]
        });
        const marker = L.marker(position, { icon, draggable: Boolean(payload.interactive) }).addTo(map);
        if (point.label) marker.bindTooltip(point.label);
        if (payload.interactive) {
          marker.on('dragend', function(event) {
            const next = event.target.getLatLng();
            window.ReactNativeWebView?.postMessage(JSON.stringify({
              type: 'location',
              latitude: next.lat,
              longitude: next.lng
            }));
          });
        }
      });

      if (route.length > 1) {
        const routePoints = route.map((point) => [point.latitude, point.longitude]);
        L.polyline(routePoints, { color: '#14532d', weight: 5, opacity: 0.8 }).addTo(map);
        routePoints.forEach((point) => bounds.push(point));
      }

      if (bounds.length > 1) map.fitBounds(bounds, { padding: [24, 24] });
    </script>
  </body>
</html>`;
}

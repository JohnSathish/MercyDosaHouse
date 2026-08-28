import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type RouteEstimate = {
  distanceKm: number;
  durationMinutes: number;
  polyline: string | null;
};

@Injectable()
export class RoutingService {
  private readonly logger = new Logger(RoutingService.name);

  constructor(private config: ConfigService) {}

  async getRoute(
    origin: { latitude: number; longitude: number },
    destination: { latitude: number; longitude: number },
  ): Promise<RouteEstimate | null> {
    const provider = this.config.get<string>('ROUTING_PROVIDER')?.trim().toLowerCase();
    const openRouteKey = this.config.get<string>('OPENROUTESERVICE_API_KEY')?.trim();

    if (provider === 'openrouteservice' || (!provider && openRouteKey)) {
      return this.getOpenRouteServiceRoute(origin, destination, openRouteKey);
    }

    if (provider && provider !== 'google') return null;

    return this.getGoogleRoute(origin, destination);
  }

  private async getGoogleRoute(
    origin: { latitude: number; longitude: number },
    destination: { latitude: number; longitude: number },
  ): Promise<RouteEstimate | null> {
    const key = this.config.get<string>('GOOGLE_MAPS_SERVER_KEY')?.trim();
    if (!key) return null;

    const params = new URLSearchParams({
      origin: `${origin.latitude},${origin.longitude}`,
      destination: `${destination.latitude},${destination.longitude}`,
      mode: 'driving',
      key,
    });

    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/directions/json?${params.toString()}`,
      );
      if (!response.ok) return null;
      const result = (await response.json()) as {
        status?: string;
        routes?: Array<{
          overview_polyline?: { points?: string };
          legs?: Array<{ distance?: { value?: number }; duration?: { value?: number } }>;
        }>;
      };
      const route = result.routes?.[0];
      const leg = route?.legs?.[0];
      if (result.status !== 'OK' || !route || !leg?.distance?.value || !leg.duration?.value) {
        return null;
      }
      return {
        distanceKm: Number((leg.distance.value / 1000).toFixed(2)),
        durationMinutes: Math.max(1, Math.ceil(leg.duration.value / 60)),
        polyline: route.overview_polyline?.points ?? null,
      };
    } catch (error) {
      this.logger.warn(
        `Directions request failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      return null;
    }
  }

  private async getOpenRouteServiceRoute(
    origin: { latitude: number; longitude: number },
    destination: { latitude: number; longitude: number },
    apiKey?: string,
  ): Promise<RouteEstimate | null> {
    if (!apiKey) return null;

    const baseUrl =
      this.config.get<string>('OPENROUTESERVICE_BASE_URL')?.trim() ||
      'https://api.openrouteservice.org';

    try {
      const response = await fetch(
        `${baseUrl}/v2/directions/driving-car?geometry_format=encodedpolyline`,
        {
          method: 'POST',
          headers: {
            Authorization: apiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            coordinates: [
              [origin.longitude, origin.latitude],
              [destination.longitude, destination.latitude],
            ],
          }),
        },
      );
      if (!response.ok) return null;

      const result = (await response.json()) as {
        features?: Array<{
          geometry?: string;
          properties?: {
            segments?: Array<{ distance?: number; duration?: number }>;
          };
        }>;
      };
      const feature = result.features?.[0];
      const segment = feature?.properties?.segments?.[0];
      if (!feature || !segment?.distance || !segment.duration) return null;

      return {
        distanceKm: Number((segment.distance / 1000).toFixed(2)),
        durationMinutes: Math.max(1, Math.ceil(segment.duration / 60)),
        polyline: typeof feature.geometry === 'string' ? feature.geometry : null,
      };
    } catch (error) {
      this.logger.warn(
        `OpenRouteService request failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return null;
    }
  }
}

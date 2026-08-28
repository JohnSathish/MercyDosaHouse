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
}

export type DeliveryExecutiveStatus = 'ONLINE' | 'OFFLINE' | 'BUSY' | 'BREAK' | 'INACTIVE';

export type DeliveryAssignmentStatus =
  'WAITING' | 'ASSIGNED' | 'PICKED_UP' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'CANCELLED';

export interface DeliveryExecutiveDto {
  id: string;
  employeeId: string;
  name: string;
  phone?: string | null;
  rating: number;
  status: DeliveryExecutiveStatus;
  activeOrders: number;
  totalDeliveries: number;
  todayEarnings: number;
  vehicleNumber?: string | null;
  vehicleType?: string | null;
  currentLat?: number | null;
  currentLng?: number | null;
}

export interface DeliveryAssignmentDto {
  id: string;
  status: DeliveryAssignmentStatus;
  etaMinutes?: number | null;
  distanceKm?: number | null;
  assignedAt?: string | null;
  pickedUpAt?: string | null;
  outForDeliveryAt?: string | null;
  deliveredAt?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  lastLocationAt?: string | null;
  locationAccuracyMeters?: number | null;
  locationSharingActive?: boolean;
  routePolyline?: string | null;
  deliveryNotes?: string | null;
  executive?: {
    id: string;
    employeeId: string;
    name?: string | null;
    phone?: string | null;
    vehicleType?: string | null;
    vehicleNumber?: string | null;
    rating: number;
    status: DeliveryExecutiveStatus;
  } | null;
  zone?: { name: string; charge: number } | null;
}

export interface DeliveryOrderDto {
  id: string;
  orderNumber: string;
  status: string;
  trackingStatus?: string | null;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  deliveryLandmark?: string | null;
  deliveryLatitude?: number | null;
  deliveryLongitude?: number | null;
  deliveryInstructions?: string | null;
  deliveryOtp?: string | null;
  grandTotal: number;
  deliveryCharge: number;
  paymentMethod: string;
  paymentStatus: string;
  createdAt: string;
  items: { productName: string; quantity: number }[];
  assignment?: DeliveryAssignmentDto | null;
}

export interface LiveDeliveryLocationDto {
  orderId: string;
  orderNumber: string;
  status: string;
  active: boolean;
  customer: { latitude: number | null; longitude: number | null; address: string | null };
  agent: {
    name: string | null;
    phone: string | null;
    latitude: number | null;
    longitude: number | null;
    accuracyMeters: number | null;
    lastUpdatedAt: string | null;
  } | null;
  distanceKm: number | null;
  etaMinutes: number | null;
  routePolyline: string | null;
  lastUpdatedAt: string | null;
}

export interface DeliveryDashboardDto {
  stats: {
    waiting: number;
    assigned: number;
    pickedUp: number;
    onTheWay: number;
    deliveredToday: number;
    cancelledToday: number;
    avgDeliveryMinutes: number;
    deliveryRevenue: number;
    onlineRiders: number;
  };
  executives: DeliveryExecutiveDto[];
  pendingOrders: DeliveryOrderDto[];
  recentDeliveries: DeliveryOrderDto[];
  liveRiders: {
    id: string;
    name?: string | null;
    lat?: number | null;
    lng?: number | null;
    status: DeliveryExecutiveStatus;
  }[];
}

export interface DeliveryZoneDto {
  id: string;
  name: string;
  slug: string;
  minKm: number;
  maxKm: number;
  charge: number;
  minimumOrderAmount?: number | null;
  estimatedDeliveryMinutes?: number | null;
  polygon?: Array<{ latitude: number; longitude: number }> | null;
  isActive: boolean;
  sortOrder: number;
}

export interface DeliveryTimelineEventDto {
  type: string;
  description: string;
  createdAt: string;
}

export interface DeliveryExecutiveDetailDto {
  id: string;
  employeeId: string;
  photoUrl?: string | null;
  vehicleType?: string | null;
  vehicleNumber?: string | null;
  licenseNumber?: string | null;
  joiningDate?: string | null;
  rating: number;
  status: DeliveryExecutiveStatus;
  activeOrders: number;
  totalDeliveries: number;
  todayEarnings: number;
  currentLat?: number | null;
  currentLng?: number | null;
  isActive: boolean;
  user?: { name?: string | null; phone?: string | null; email?: string | null };
  _count?: { tracking: number };
}

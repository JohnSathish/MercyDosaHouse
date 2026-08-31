export interface AppPromoConfigDto {
  enabled: boolean;
  title: string;
  body: string;
  ctaLabel: string;
  playStoreUrl: string;
  showOnWebsite: boolean;
  showOnCheckout: boolean;
  showOnMenu: boolean;
  showAsPopup: boolean;
}

export interface AppDiscountPerformanceDto {
  appOrders: number;
  websiteOrders: number;
  appDiscountOrders: number;
  discountGiven: number;
  appRevenue: number;
  newAppCustomers: number;
  appConversion: number;
}

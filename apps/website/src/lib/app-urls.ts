export const APP_URLS = {
  website:
    process.env.NEXT_PUBLIC_WEBSITE_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    'https://mercydosahouse.com',
  admin: process.env.NEXT_PUBLIC_ADMIN_URL || 'https://admin.mercydosahouse.com',
  kitchen: process.env.NEXT_PUBLIC_KITCHEN_URL || 'https://kitchen.mercydosahouse.com',
  delivery: process.env.NEXT_PUBLIC_DELIVERY_URL || 'https://delivery.mercydosahouse.com',
};

export const APP_URLS = {
  website:
    process.env.NEXT_PUBLIC_WEBSITE_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    'https://mercydosahouse.com',
  admin: process.env.NEXT_PUBLIC_ADMIN_URL || 'https://admin.mercydosahouse.com',
  api: process.env.NEXT_PUBLIC_API_URL || 'https://mercydosahouse.com/api/v1',
  kitchen: process.env.NEXT_PUBLIC_KITCHEN_URL || 'https://kitchen.mercydosahouse.com',
  delivery: process.env.NEXT_PUBLIC_DELIVERY_URL || 'https://delivery.mercydosahouse.com',
  pos: process.env.NEXT_PUBLIC_POS_URL || 'https://pos.mercydosahouse.com',
};

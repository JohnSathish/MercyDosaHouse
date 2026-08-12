import type { NextConfig } from 'next';

const isProd = process.env.NODE_ENV === 'production';
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://mercydosahouse.com';

const nextConfig: NextConfig = {
  output: 'standalone',
  transpilePackages: ['@mdh/ui', '@mdh/types', '@mdh/utils', '@mdh/sdk', '@mdh/auth-client'],
  poweredByHeader: false,
  compress: true,
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: isProd
      ? [
          { protocol: 'https', hostname: 'mercydosahouse.com' },
          { protocol: 'https', hostname: 'www.mercydosahouse.com' },
          { protocol: 'https', hostname: '**.mercydosahouse.com' },
        ]
      : [
          { protocol: 'http', hostname: 'localhost' },
          { protocol: 'https', hostname: '**' },
        ],
  },
  env: {
    NEXT_PUBLIC_SITE_URL: siteUrl,
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1',
    NEXT_PUBLIC_WEBSITE_URL: process.env.NEXT_PUBLIC_WEBSITE_URL || siteUrl,
  },
};

export default nextConfig;

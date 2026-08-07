import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@mdh/ui', '@mdh/types', '@mdh/utils', '@mdh/sdk', '@mdh/auth-client'],
  images: {
    remotePatterns: [
      { protocol: 'http', hostname: '**' },
      { protocol: 'https', hostname: '**' },
    ],
  },
};

export default nextConfig;

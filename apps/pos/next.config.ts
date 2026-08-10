import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: [
    '@mdh/ui',
    '@mdh/pos-ui',
    '@mdh/types',
    '@mdh/utils',
    '@mdh/auth-client',
    '@mdh/sdk',
  ],
};

export default nextConfig;

import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@mdh/ui', '@mdh/types', '@mdh/utils', '@mdh/sdk', '@mdh/auth-client'],
};

export default nextConfig;

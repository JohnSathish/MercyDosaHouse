import type { NextConfig } from 'next';

const websiteUrl = process.env.NEXT_PUBLIC_WEBSITE_URL || 'http://localhost:3000';
const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

function hostnameFrom(url: string) {
  try {
    return new URL(url).hostname;
  } catch {
    return 'localhost';
  }
}

const nextConfig: NextConfig = {
  transpilePackages: ['@mdh/ui', '@mdh/types', '@mdh/utils', '@mdh/sdk', '@mdh/auth-client'],
  images: {
    remotePatterns: [
      { protocol: 'http', hostname: hostnameFrom(websiteUrl), pathname: '/**' },
      { protocol: 'https', hostname: hostnameFrom(websiteUrl), pathname: '/**' },
      { protocol: 'http', hostname: hostnameFrom(apiUrl), pathname: '/**' },
      { protocol: 'https', hostname: hostnameFrom(apiUrl), pathname: '/**' },
    ],
  },
};

export default nextConfig;

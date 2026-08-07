import type { NextConfig } from 'next';

export default {
  transpilePackages: ['@mdh/ui', '@mdh/types', '@mdh/utils', '@mdh/sdk', '@mdh/auth-client'],
} satisfies NextConfig;

import { createApiClient } from '@mdh/sdk';

export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
export const api = createApiClient(API_URL);

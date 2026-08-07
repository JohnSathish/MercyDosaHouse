import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const brand = {
  primary: '#0F5132',
  secondary: '#F59E0B',
  accent: '#FFF7E6',
  background: '#FFFFFF',
  name: 'Mercy Dosa House',
  tagline: 'Freshly Made. Delivered with Love.',
} as const;

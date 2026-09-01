import { buildPageMetadata } from '@/lib/seo';

export const generateMetadata = () =>
  buildPageMetadata('reviews', '/reviews', {
    title: 'Customer Reviews',
    description: 'Verified customer reviews for Mercy Dosa House in Tura, Meghalaya.',
  });

export default function ReviewsLayout({ children }: { children: React.ReactNode }) {
  return children;
}

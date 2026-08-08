import { MenuPageSkeleton } from '@/components/skeletons/menu-page-skeleton';

export default function HomeLoading() {
  return (
    <>
      <div className="hero-pattern min-h-[70vh] animate-pulse" />
      <MenuPageSkeleton />
    </>
  );
}

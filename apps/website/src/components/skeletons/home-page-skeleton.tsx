import { Skeleton } from '@mdh/ui';
import { ProductGridSkeleton } from '@/components/skeletons/product-card-skeleton';

export function HomePageSkeleton() {
  return (
    <>
      <section className="hero-pattern min-h-[85vh] pt-24 pb-16">
        <div className="container mx-auto px-4 grid lg:grid-cols-2 gap-10 items-center">
          <div className="space-y-4">
            <Skeleton className="h-4 w-40 bg-white/20" />
            <Skeleton className="h-12 w-full max-w-md bg-white/20" />
            <Skeleton className="h-6 w-48 bg-white/20" />
            <div className="flex gap-3 pt-2">
              <Skeleton className="h-11 w-32 bg-white/20 rounded-md" />
              <Skeleton className="h-11 w-32 bg-white/20 rounded-md" />
            </div>
          </div>
          <Skeleton className="h-72 lg:h-96 rounded-3xl bg-white/10" />
        </div>
      </section>
      <div className="py-16 bg-[#FFF8E8]">
        <div className="container mx-auto px-4">
          <ProductGridSkeleton count={4} />
        </div>
      </div>
    </>
  );
}

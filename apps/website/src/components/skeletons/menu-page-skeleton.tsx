import { ProductCardSkeleton } from '@/components/product-card';

export function MenuPageSkeleton() {
  return (
    <div className="pt-24 pb-16">
      <div className="container mx-auto px-4">
        <div className="animate-pulse mb-10">
          <div className="h-4 bg-gray-200 rounded w-24 mb-3" />
          <div className="h-10 bg-gray-200 rounded w-64 mb-2" />
          <div className="h-5 bg-gray-200 rounded w-96 max-w-full" />
        </div>

        <div className="flex flex-wrap gap-3 mb-8 animate-pulse">
          <div className="h-10 bg-gray-200 rounded-full w-64" />
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-10 bg-gray-200 rounded-full w-24" />
          ))}
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}

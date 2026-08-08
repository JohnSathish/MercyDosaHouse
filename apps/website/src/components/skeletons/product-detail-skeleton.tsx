export function ProductDetailSkeleton() {
  return (
    <div className="pt-24 pb-16">
      <div className="container mx-auto px-4 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-32 mb-6" />
        <div className="grid md:grid-cols-2 gap-8">
          <div className="h-80 md:h-96 bg-gray-200 rounded-2xl" />
          <div className="space-y-4">
            <div className="flex gap-2">
              <div className="h-6 bg-gray-200 rounded-full w-12" />
              <div className="h-6 bg-gray-200 rounded-full w-16" />
            </div>
            <div className="h-10 bg-gray-200 rounded w-3/4" />
            <div className="h-8 bg-gray-200 rounded w-1/4" />
            <div className="h-4 bg-gray-200 rounded w-full" />
            <div className="h-4 bg-gray-200 rounded w-full" />
            <div className="h-4 bg-gray-200 rounded w-2/3" />
            <div className="h-12 bg-gray-200 rounded-xl w-48 mt-4" />
          </div>
        </div>
      </div>
    </div>
  );
}

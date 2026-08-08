export default function OrderSuccessLoading() {
  return (
    <div className="container mx-auto px-4 py-16 max-w-lg text-center">
      <div className="animate-pulse space-y-4">
        <div className="w-20 h-20 bg-muted rounded-full mx-auto" />
        <div className="h-6 bg-muted rounded w-48 mx-auto" />
        <div className="h-4 bg-muted rounded w-64 mx-auto" />
      </div>
    </div>
  );
}

import { Skeleton } from "@/components/ui/skeleton";

export function PageLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-72" />
      <div className="space-y-3">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    </div>
  );
}

export function SeriesDetailLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-4 w-64" />
      <div className="flex gap-6">
        <Skeleton className="h-[300px] w-[200px] rounded-lg" />
        <div className="flex-1 space-y-3">
          <Skeleton className="h-8 w-48" />
          <div className="flex gap-2">
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-5 w-16" />
          </div>
          <Skeleton className="h-16 w-full" />
        </div>
      </div>
    </div>
  );
}

export function CardGridLoading() {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="aspect-[2/3] w-full rounded-lg" />
          <Skeleton className="h-4 w-24" />
        </div>
      ))}
    </div>
  );
}

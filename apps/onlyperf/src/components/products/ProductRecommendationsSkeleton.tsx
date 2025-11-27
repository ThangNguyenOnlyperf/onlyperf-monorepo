import { Skeleton } from "@/components/ui/skeleton";

export function ProductRecommendationsSkeleton() {
  return (
    <section className="mt-16 space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <div className="flex gap-2">
          <Skeleton className="h-10 w-10 rounded-full" />
          <Skeleton className="h-10 w-10 rounded-full" />
        </div>
      </div>
      <div className="flex gap-4 overflow-hidden pb-4">
        {[...Array(4)].map((_, index) => (
          <div key={index} className="w-[300px] flex-shrink-0">
            <article className="flex h-full flex-col">
              <div className="mb-3 aspect-square overflow-hidden">
                <Skeleton className="h-full w-full rounded-sm" />
              </div>
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
                <Skeleton className="h-4 w-16" />
              </div>
            </article>
          </div>
        ))}
      </div>
    </section>
  );
}

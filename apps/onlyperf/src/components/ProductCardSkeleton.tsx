import { Skeleton } from "@/components/ui/skeleton";

/**
 * Skeleton loader for ProductCard image only
 * Used as overlay while image is loading
 */
export function ProductCardSkeleton() {
  return <Skeleton className="h-full w-full rounded-sm" />;
}

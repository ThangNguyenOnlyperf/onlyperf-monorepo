export default function ProductDetailLoading() {
  return (
    <main className="mx-auto container-max px-6 py-12">
      <article>
        {/* Product Detail Skeleton - matches ProductDetailClient layout */}
        <div className="grid gap-8 lg:grid-cols-2">
          {/* Left Column: Image Gallery */}
          <div className="lg:sticky lg:top-16 lg:h-fit lg:self-start pt-4 lg:flex lg:flex-col md:gap-6">
            {/* Mobile: Product Meta (Title, Price) */}
            <div className="block lg:hidden space-y-4 mb-6">
              <div className="h-8 w-3/4 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse" />
              <div className="h-6 w-32 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse" />
              <div className="flex gap-2">
                <div className="h-5 w-16 bg-zinc-200 dark:bg-zinc-700 rounded-full animate-pulse" />
                <div className="h-5 w-20 bg-zinc-200 dark:bg-zinc-700 rounded-full animate-pulse" />
              </div>
            </div>

            {/* Main Product Image */}
            <div className="mt-6 md:mt-0">
              <div className="aspect-square bg-zinc-200 dark:bg-zinc-700 rounded-lg animate-pulse" />

              {/* Thumbnail Gallery */}
              <div className="mt-4 flex gap-2 overflow-x-auto">
                {[...Array(4)].map((_, i) => (
                  <div
                    key={i}
                    className="w-20 h-20 bg-zinc-200 dark:bg-zinc-700 rounded-md animate-pulse shrink-0"
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Product Info & Actions */}
          <div className="sticky flex flex-col pt-4 gap-8 top-16 h-fit self-start">
            {/* Desktop: Product Meta (Title, Price) */}
            <div className="hidden lg:block space-y-4">
              <div className="h-10 w-3/4 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse" />
              <div className="h-8 w-40 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse" />
              <div className="flex gap-2">
                <div className="h-6 w-20 bg-zinc-200 dark:bg-zinc-700 rounded-full animate-pulse" />
                <div className="h-6 w-24 bg-zinc-200 dark:bg-zinc-700 rounded-full animate-pulse" />
              </div>
            </div>

            {/* Size Selector Skeleton */}
            <div className="space-y-3">
              <div className="h-4 w-24 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse" />
              <div className="flex gap-2 flex-wrap">
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className="w-16 h-10 bg-zinc-200 dark:bg-zinc-700 rounded-md animate-pulse"
                  />
                ))}
              </div>
            </div>

            {/* Color Selector Skeleton */}
            <div className="space-y-3">
              <div className="h-4 w-32 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse" />
              <div className="flex gap-2">
                {[...Array(4)].map((_, i) => (
                  <div
                    key={i}
                    className="w-10 h-10 bg-zinc-200 dark:bg-zinc-700 rounded-full animate-pulse"
                  />
                ))}
              </div>
            </div>

            {/* Add to Cart Button Skeleton */}
            <div className="h-12 w-full bg-zinc-200 dark:bg-zinc-700 rounded-full animate-pulse" />

            {/* Product Details Accordion Skeleton */}
            <div className="space-y-4 border-t border-zinc-200 dark:border-zinc-700 pt-4">
              <div className="h-6 w-40 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse" />
              <div className="space-y-2">
                <div className="h-4 w-full bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse" />
                <div className="h-4 w-full bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse" />
                <div className="h-4 w-3/4 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse" />
              </div>
            </div>
          </div>
        </div>
      </article>

      {/* Product Recommendations Skeleton */}
      <section className="mt-16 space-y-6">
        <div className="h-8 w-48 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="space-y-3">
              <div className="aspect-square bg-zinc-200 dark:bg-zinc-700 rounded-lg animate-pulse" />
              <div className="space-y-2">
                <div className="h-4 w-full bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse" />
                <div className="h-4 w-2/3 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse" />
              </div>
              <div className="h-6 w-24 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

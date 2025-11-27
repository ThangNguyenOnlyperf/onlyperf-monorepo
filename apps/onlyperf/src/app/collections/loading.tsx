export default function ProductsLoading() {
  return (
    <main className="container-page">
      {/* Header Skeleton */}
      <header className="space-y-3">
        <div className="h-5 w-24 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse"></div>
        <div className="h-10 w-64 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse"></div>
        <div className="h-4 w-full max-w-2xl bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse"></div>
      </header>

      {/* Category Navigation Skeleton */}
      <nav className="space-y-6">
        <div className="h-4 w-20 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse"></div>
        <div className="flex snap-x gap-6 overflow-x-auto pb-4 sm:gap-8 lg:gap-10">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="group relative flex flex-col shrink-0 snap-start items-start gap-3"
            >
              <div className="p-1">
                <div className="w-[125px] h-[170px] flex shrink-0 snap-start flex-col items-center gap-3">
                  <div className="relative flex w-full h-full items-center justify-center overflow-hidden border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 p-6">
                    <div className="h-4 w-16 bg-zinc-200 dark:bg-zinc-600 rounded animate-pulse"></div>
                  </div>
                </div>
              </div>
              <div className="h-3 w-20 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse"></div>
            </div>
          ))}
        </div>
      </nav>

      {/* Sort Control Skeleton */}
      <div className="flex items-center justify-end">
        <div className="h-10 w-32 bg-zinc-200 dark:bg-zinc-700 rounded-lg animate-pulse"></div>
      </div>

      {/* Product Grid Skeleton */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="space-y-3">
            {/* Product Image Skeleton */}
            <div className="aspect-square bg-zinc-200 dark:bg-zinc-700 rounded-lg animate-pulse"></div>

            {/* Product Title Skeleton */}
            <div className="space-y-2">
              <div className="h-4 w-full bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse"></div>
              <div className="h-4 w-3/4 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse"></div>
            </div>

            {/* Product Price Skeleton */}
            <div className="h-6 w-24 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse"></div>
          </div>
        ))}
      </section>
    </main>
  );
}

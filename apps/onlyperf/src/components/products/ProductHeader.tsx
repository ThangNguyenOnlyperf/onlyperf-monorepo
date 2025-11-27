interface ProductHeaderProps {
  productType?: string | null;
  title: string;
  vendor?: string | null;
  tags: string[];
}

export function ProductHeader({
  productType,
  title,
  vendor,
  tags,
}: ProductHeaderProps) {
  return (
    <header className="space-y-4">
      <div>
        <p className="text-sm uppercase tracking-wide text-zinc-500">
          {productType ?? "Sản phẩm"}
        </p>
        <h1 className="mt-1 text-3xl font-semibold text-zinc-900 dark:text-white">
          {title}
        </h1>
      </div>
      <div className="flex flex-wrap items-center gap-3 text-sm text-zinc-600 dark:text-zinc-400">
        {vendor && (
          <span className="rounded-full border border-zinc-200 px-3 py-1 dark:border-zinc-700">
            Nhà cung cấp: {vendor}
          </span>
        )}
        {tags.length > 0 && (
          <ul className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <li
                key={tag}
                className="rounded-full bg-zinc-100 px-3 py-1 text-xs uppercase tracking-wide text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
              >
                {tag}
              </li>
            ))}
          </ul>
        )}
      </div>
    </header>
  );
}

import { Minus, Plus } from "lucide-react";

interface ProductQuantityPillsProps {
  quantity: number;
}

export function ProductQuantityPills({ quantity }: ProductQuantityPillsProps) {
  return (
    <div className="flex h-12 items-center rounded-full border border-zinc-300 bg-white dark:border-zinc-600 dark:bg-zinc-800">
      <button
        type="button"
        className="flex h-12 w-12 items-center justify-center rounded-l-full text-zinc-700 transition-colors hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-700"
        aria-label="Giảm số lượng"
      >
        <Minus className="size-4" />
      </button>
      <span className="min-w-[3rem] select-none text-center font-medium text-zinc-900 dark:text-white">
        {quantity}
      </span>
      <button
        type="button"
        className="flex h-12 w-12 items-center justify-center rounded-r-full text-zinc-700 transition-colors hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-700"
        aria-label="Tăng số lượng"
      >
        <Plus className="size-4" />
      </button>
    </div>
  );
}

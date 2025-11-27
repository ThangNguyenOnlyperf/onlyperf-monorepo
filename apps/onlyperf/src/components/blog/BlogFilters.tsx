"use client";

import { FilterIcon } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface BlogFiltersProps {
  availableTags: string[];
}

const SORT_OPTIONS = [
  { value: "newest", label: "Mới nhất" },
  { value: "oldest", label: "Cũ nhất" },
  { value: "a-z", label: "A → Z" },
  { value: "z-a", label: "Z → A" },
] as const;

export function BlogFilters({ availableTags }: BlogFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentSort = searchParams.get("sort") || "";
  const currentTagsParam = searchParams.get("tags") || "";
  const currentTags = currentTagsParam
    ? currentTagsParam.split(",").filter(Boolean)
    : [];

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [tempSelectedTags, setTempSelectedTags] = useState<string[]>([]);

  const hasActiveFilters = currentSort || currentTags.length > 0;

  const handleSortChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());

    if (value) {
      params.set("sort", value);
    } else {
      params.delete("sort");
    }

    params.set("page", "1");
    router.push(`?${params.toString()}`, { scroll: false });
  };

  const handleDialogOpen = (open: boolean) => {
    if (open) {
      // Initialize temp state with current selections when opening
      setTempSelectedTags([...currentTags]);
    }
    setIsDialogOpen(open);
  };

  const toggleTag = (tag: string) => {
    setTempSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleApply = () => {
    const params = new URLSearchParams(searchParams.toString());

    if (tempSelectedTags.length > 0) {
      params.set("tags", tempSelectedTags.join(","));
    } else {
      params.delete("tags");
    }

    params.set("page", "1");
    router.push(`?${params.toString()}`, { scroll: false });
    setIsDialogOpen(false);
  };

  const handleCancel = () => {
    setIsDialogOpen(false);
  };

  const handleReset = () => {
    setTempSelectedTags([]);
    const params = new URLSearchParams(searchParams.toString());
    params.delete("tags");
    params.set("page", "1");
    router.push(`?${params.toString()}`, { scroll: false });
    setIsDialogOpen(false);
  };

  const handleResetAll = () => {
    const params = new URLSearchParams();
    params.set("page", "1");
    router.push(`?${params.toString()}`, { scroll: false });
  };

  // Display text for dialog trigger
  const triggerText =
    currentTags.length > 0
      ? `Thẻ: ${currentTags.slice(0, 2).join(", ")}${currentTags.length > 2 ? "..." : ""}`
      : "Chọn thẻ";

  return (
    <div className=" flex flex-wrap items-center gap-4">
      <div className="flex items-center gap-2">
        <FilterIcon className="h-5 w-5 text-zinc-600 dark:text-zinc-400" />
        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Lọc và sắp xếp:
        </span>
      </div>

      {/* Sort Select */}
      <Select value={currentSort} onValueChange={handleSortChange}>
        <SelectTrigger
          size="sm"
          className="w-fit"
          aria-label="Sắp xếp bài viết"
        >
          <SelectValue placeholder="Sắp xếp" />
        </SelectTrigger>
        <SelectContent>
          {SORT_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Tag Filter Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={handleDialogOpen}>
        <DialogTrigger asChild>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition hover:border-brand focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:border-brand"
            aria-label="Lọc theo thẻ"
          >
            <FilterIcon className="h-4 w-4" />
            {triggerText}
          </button>
        </DialogTrigger>

        <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Lọc theo thẻ</DialogTitle>
            <DialogDescription>
              Tìm bài viết có tất cả các thẻ đã chọn bên dưới
            </DialogDescription>
          </DialogHeader>

          {/* Tag Chips Grid */}
          <div className="flex flex-wrap gap-2 py-4">
            {availableTags.length === 0 ? (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Không có thẻ nào
              </p>
            ) : (
              availableTags.map((tag) => {
                const isSelected = tempSelectedTags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                      isSelected
                        ? "border-brand bg-brand text-white hover:bg-brand/90"
                        : "border-zinc-300 bg-zinc-100 text-zinc-700 hover:border-brand hover:bg-zinc-200 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:border-brand dark:hover:bg-zinc-700"
                    }`}
                  >
                    {tag}
                  </button>
                );
              })
            )}
          </div>

          <DialogFooter className="gap-2">
            <button
              type="button"
              onClick={handleReset}
              className="rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition hover:border-red-500 hover:bg-red-50 hover:text-red-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:border-red-500 dark:hover:bg-red-950 dark:hover:text-red-400"
            >
              Xóa bộ lọc
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="rounded-md border border-brand bg-brand px-4 py-2 text-sm font-medium text-white transition hover:bg-brand/90"
            >
              Áp dụng
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset All Button - Only show when filters are active */}
      {hasActiveFilters && (
        <button
          type="button"
          onClick={handleResetAll}
          className="inline-flex items-center gap-2 rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition hover:border-red-500 hover:bg-red-50 hover:text-red-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:border-red-500 dark:hover:bg-red-950 dark:hover:text-red-400"
          aria-label="Xóa tất cả bộ lọc"
        >
          Xóa tất cả
        </button>
      )}
    </div>
  );
}

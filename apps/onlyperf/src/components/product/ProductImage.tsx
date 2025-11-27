import Image from "next/image";

interface ProductImageProps {
  src: string;
  alt: string;
  priority?: boolean;
  fetchPriority?: "high" | "low" | "auto";
}

/**
 * Product image component with consistent aspect ratio and styling
 */
export function ProductImage({
  src,
  alt,
  priority = false,
  fetchPriority,
}: ProductImageProps) {
  return (
    <div className="relative aspect-square overflow-hidden rounded-sm bg-zinc-100 dark:bg-zinc-800">
      <Image
        src={src}
        alt={alt}
        fill
        sizes="(min-width: 1024px) 50vw, 90vw"
        className="object-cover"
        priority={priority}
        fetchPriority={fetchPriority}
      />
    </div>
  );
}

/**
 * Fallback component when no image is available
 */
export function ProductImageFallback() {
  return (
    <div className="relative aspect-square overflow-hidden rounded-sm bg-zinc-100 dark:bg-zinc-800">
      <div className="flex h-full items-center justify-center text-sm text-zinc-500">
        Chưa có hình ảnh
      </div>
    </div>
  );
}

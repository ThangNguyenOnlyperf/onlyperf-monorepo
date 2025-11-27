'use client';

import { cn } from '~/lib/utils';

interface ColorDotProps {
  hex?: string | null; // e.g. #FF0000
  title?: string;
  size?: number; // pixel size for width/height
  className?: string;
  border?: boolean;
}

export default function ColorDot({
  hex,
  title,
  size = 12,
  className,
  border = true,
}: ColorDotProps) {
  const bg = hex && /^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/.test(hex) ? hex : '#e5e7eb';
  return (
    <span
      className={cn('inline-block rounded-full', border && 'border', className)}
      style={{ width: size, height: size, backgroundColor: bg }}
      title={title}
      aria-label={title}
    />
  );
}


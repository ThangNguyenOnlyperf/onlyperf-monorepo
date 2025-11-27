import { useCallback, useRef } from "react";

/**
 * Custom hook for managing horizontal carousel scrolling
 * Provides smooth scrolling functionality for carousel containers
 *
 * @param scrollAmount - Amount to scroll in pixels, defaults to 400px
 * @returns Container ref and scroll functions
 */
export function useCarouselScroll(scrollAmount = 400) {
  const containerRef = useRef<HTMLDivElement>(null);

  /**
   * Scroll the carousel left
   */
  const scrollLeft = useCallback(() => {
    if (!containerRef.current) return;

    const newScrollPosition = containerRef.current.scrollLeft - scrollAmount;

    containerRef.current.scrollTo({
      left: newScrollPosition,
      behavior: "smooth",
    });
  }, [scrollAmount]);

  /**
   * Scroll the carousel right
   */
  const scrollRight = useCallback(() => {
    if (!containerRef.current) return;

    const newScrollPosition = containerRef.current.scrollLeft + scrollAmount;

    containerRef.current.scrollTo({
      left: newScrollPosition,
      behavior: "smooth",
    });
  }, [scrollAmount]);

  return {
    containerRef,
    scrollLeft,
    scrollRight,
  };
}

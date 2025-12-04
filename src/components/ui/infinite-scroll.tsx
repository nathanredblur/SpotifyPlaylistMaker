import * as React from "react";

interface InfiniteScrollProps {
  isLoading: boolean;
  hasMore: boolean;
  next: () => void;
  /** Threshold in pixels from the bottom to trigger loading */
  threshold?: number;
  children?: React.ReactNode;
  className?: string;
}

/**
 * InfiniteScroll container that detects when the user has scrolled
 * near the bottom and loads more content.
 *
 * This component wraps children in a scrollable container and uses
 * scroll events to detect when to load more.
 */
export function InfiniteScroll({
  isLoading,
  hasMore,
  next,
  threshold = 300,
  children,
  className,
}: InfiniteScrollProps) {
  const containerRef = React.useRef<HTMLDivElement | null>(null);

  // Store refs to avoid stale closures
  const isLoadingRef = React.useRef(isLoading);
  const hasMoreRef = React.useRef(hasMore);
  const nextRef = React.useRef(next);

  // Update refs when props change
  React.useEffect(() => {
    isLoadingRef.current = isLoading;
    hasMoreRef.current = hasMore;
    nextRef.current = next;
  }, [isLoading, hasMore, next]);

  React.useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      if (isLoadingRef.current || !hasMoreRef.current) return;

      const { scrollTop, scrollHeight, clientHeight } = container;
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight;

      if (distanceFromBottom < threshold) {
        nextRef.current();
      }
    };

    container.addEventListener("scroll", handleScroll, { passive: true });

    // Check on mount in case content doesn't fill the container
    handleScroll();

    return () => {
      container.removeEventListener("scroll", handleScroll);
    };
  }, [threshold]);

  return (
    <div ref={containerRef} className={className} style={{ overflowY: "auto" }}>
      {children}
    </div>
  );
}

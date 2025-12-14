/**
 * Marquee Text Component
 * Smoothly scrolls text that's too long to fit
 */

import { useRef, useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface MarqueeTextProps {
  text: string;
  className?: string;
}

export function MarqueeText({ text, className }: MarqueeTextProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const [shouldAnimate, setShouldAnimate] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    const textEl = textRef.current;

    if (!container || !textEl) return;

    // Check if text overflows
    const checkOverflow = () => {
      setShouldAnimate(textEl.scrollWidth > container.clientWidth);
    };

    checkOverflow();

    // Re-check on resize
    const observer = new ResizeObserver(checkOverflow);
    observer.observe(container);

    return () => observer.disconnect();
  }, [text]);

  return (
    <div
      ref={containerRef}
      className={cn("overflow-hidden whitespace-nowrap", className)}
    >
      <span
        ref={textRef}
        className={cn(
          "inline-block",
          shouldAnimate && "animate-marquee hover:animate-pause"
        )}
        style={
          shouldAnimate
            ? {
                paddingRight: "2rem",
              }
            : undefined
        }
      >
        {text}
        {shouldAnimate && (
          <span className="pl-8" aria-hidden>
            {text}
          </span>
        )}
      </span>
    </div>
  );
}


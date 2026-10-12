import { cn } from "@/lib/cn";
import { pickVariant, srcSet } from "@/lib/media";
import type { ImageVariant } from "@/lib/types";

/**
 * A photo served from the web-sized copies made at upload: the browser picks
 * the smallest one that looks sharp on the visitor's screen (srcset + sizes).
 */
export function ResponsiveImage({
  variants,
  alt,
  sizes,
  className,
  priority,
}: {
  variants: ImageVariant[];
  alt: string;
  sizes: string;
  className?: string;
  priority?: boolean;
}) {
  const fallback = pickVariant(variants, 960);
  if (!fallback) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- resized copies are made at upload time
    <img
      src={fallback.url}
      srcSet={srcSet(variants)}
      sizes={sizes}
      alt={alt}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : undefined}
      decoding="async"
      className={cn("absolute inset-0 h-full w-full", className)}
    />
  );
}

import { pickVariant } from "@/lib/media";
import { cn } from "@/lib/cn";
import type { Photo, Video } from "@/lib/types";

/** Small square preview for the dashboard. */
export function Thumb({
  photo,
  video,
  size = 240,
  className,
}: {
  photo?: Pick<Photo, "variants" | "caption"> | null;
  video?: Video | null;
  size?: number;
  className?: string;
}) {
  const src = photo ? (pickVariant(photo.variants, size)?.url ?? null) : (video?.posterUrl ?? null);
  return (
    <span className={cn("bg-cream relative block overflow-hidden", className)}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element -- smallest web-sized copy
        <img
          src={src}
          alt={photo?.caption ?? ""}
          loading="lazy"
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <span
          aria-hidden
          className="text-taupe absolute inset-0 flex items-center justify-center font-serif text-2xl"
        >
          ∞
        </span>
      )}
    </span>
  );
}

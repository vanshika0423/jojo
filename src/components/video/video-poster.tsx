import { PhotoPlaceholder } from "@/components/media/photo-placeholder";
import { cn } from "@/lib/cn";
import type { Video } from "@/lib/types";

export function VideoPoster({
  video,
  className,
  eager,
}: {
  video: Video;
  className?: string;
  eager?: boolean;
}) {
  if (video.placeholder || !video.posterUrl) {
    return <PhotoPlaceholder className={cn("absolute inset-0", className)} label={null} tone={2} />;
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- poster is already web-sized (≤1600 px) at upload
    <img
      src={video.posterUrl}
      alt=""
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      className={cn("photo-zoom-target absolute inset-0 h-full w-full object-cover", className)}
    />
  );
}

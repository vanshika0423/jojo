import { PhotoPlaceholder } from "@/components/media/photo-placeholder";
import { videoPosterUrl } from "@/lib/cloudinary/urls";
import { isCloudinaryConfigured } from "@/lib/env";
import { cn } from "@/lib/cn";
import type { Video } from "@/lib/types";

export function VideoPoster({
  video,
  sizes = "(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw",
  className,
  eager,
}: {
  video: Video;
  sizes?: string;
  className?: string;
  eager?: boolean;
}) {
  if (video.placeholder || !video.publicId || !isCloudinaryConfigured) {
    return (
      <PhotoPlaceholder
        className={cn("absolute inset-0", className)}
        label="A video of Jojo will play here"
        tone={2}
      />
    );
  }
  const widths = [480, 800, 1280, 1920];
  return (
    // eslint-disable-next-line @next/next/no-img-element -- Cloudinary serves the responsive derivatives
    <img
      src={videoPosterUrl(video, 800)}
      srcSet={widths.map((w) => `${videoPosterUrl(video, w)} ${w}w`).join(", ")}
      sizes={sizes}
      alt=""
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      className={cn("photo-zoom-target absolute inset-0 h-full w-full object-cover", className)}
    />
  );
}

import { CloudImage } from "@/components/media/cloud-image";
import { PhotoPlaceholder } from "@/components/media/photo-placeholder";
import { isCloudinaryConfigured } from "@/lib/env";
import { cn } from "@/lib/cn";
import type { Photo } from "@/lib/types";

export function photoAlt(photo: Pick<Photo, "alt" | "caption">) {
  return photo.alt || photo.caption || "A photograph of Jojo";
}

/**
 * A photograph (or its placeholder) that fills its parent. Give the parent a
 * size or aspect ratio and `relative`.
 */
export function PhotoFrame({
  photo,
  sizes,
  className,
  priority,
  placeholderLabel,
  tone,
}: {
  photo: Photo | null | undefined;
  sizes: string;
  className?: string;
  priority?: boolean;
  placeholderLabel?: string | null;
  tone?: number;
}) {
  if (!photo || photo.placeholder || !photo.publicId || !isCloudinaryConfigured) {
    return (
      <PhotoPlaceholder
        className={cn("absolute inset-0", className)}
        label={placeholderLabel}
        tone={tone ?? (photo ? Number(photo.id.replace(/\D/g, "")) || 0 : 0)}
      />
    );
  }
  return (
    <CloudImage
      publicId={photo.publicId}
      version={photo.version}
      alt={photoAlt(photo)}
      sizes={sizes}
      priority={priority}
      className={cn("object-cover", className)}
    />
  );
}

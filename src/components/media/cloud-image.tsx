"use client";

import Image, { type ImageLoaderProps } from "next/image";
import { imageUrl } from "@/lib/cloudinary/urls";

type CloudImageProps = {
  publicId: string;
  version?: number | null;
  alt: string;
  sizes: string;
  className?: string;
  priority?: boolean;
  fill?: boolean;
  width?: number;
  height?: number;
};

/**
 * next/image backed by Cloudinary: the browser picks a width from srcset and
 * Cloudinary serves an AVIF/WebP derivative at that size (f_auto, q_auto).
 */
export function CloudImage({
  publicId,
  version,
  alt,
  sizes,
  className,
  priority,
  fill = true,
  width,
  height,
}: CloudImageProps) {
  const loader = ({ width: w }: ImageLoaderProps) => imageUrl(publicId, { width: w, version });
  return (
    <Image
      loader={loader}
      src={publicId}
      alt={alt}
      sizes={sizes}
      className={className}
      {...(priority ? { preload: true } : { loading: "lazy" as const })}
      {...(fill ? { fill: true } : { width, height })}
    />
  );
}

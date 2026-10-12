import type { Metadata } from "next";
import { Suspense } from "react";
import { Gallery, GallerySkeleton } from "@/components/gallery/gallery";
import { PageHeader } from "@/components/site/section-heading";
import { getAlbums, getPhotoPage, getSettings } from "@/lib/data/public";
import { placeholderPhotos } from "@/lib/data/placeholders";
import { GALLERY_PAGE_SIZE } from "@/lib/gallery";

export const metadata: Metadata = {
  title: "A Thousand Little Moments",
  description: "Photographs of Jojo — puppy days, family moments, adventures, sleepy afternoons and everyday magic.",
  alternates: { canonical: "/memories" },
};

export default async function MemoriesPage() {
  const [albums, firstPage, settings] = await Promise.all([
    getAlbums(),
    getPhotoPage({ offset: 0, limit: GALLERY_PAGE_SIZE }),
    getSettings(),
  ]);
  const placeholderMode = firstPage.photos.length === 0;
  const initial = placeholderMode
    ? { photos: placeholderPhotos(16), hasMore: false, total: null }
    : firstPage;

  return (
    <>
      <PageHeader eyebrow="Memories" title="A Thousand Little Moments">
        <p>Every photograph is a small window back to him.</p>
      </PageHeader>
      <div className="mx-auto max-w-[96rem] px-5 pb-28 sm:px-8">
        <Suspense fallback={<GallerySkeleton />}>
          <Gallery
            albums={albums}
            initial={initial}
            allowDownloads={settings.features.allowDownloads}
            placeholderMode={placeholderMode}
          />
        </Suspense>
      </div>
    </>
  );
}

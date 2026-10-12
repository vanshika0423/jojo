import type { Metadata } from "next";
import { Suspense } from "react";
import { AlbumManager } from "@/components/admin/album-manager";
import { AdminLoading, PageTitle } from "@/components/admin/ui";
import { getAdminAlbums } from "@/lib/data/admin";

export const metadata: Metadata = { title: "Albums" };

export default function AdminAlbumsPage() {
  return (
    <>
      <PageTitle title="Albums">
        Create, rename, reorder and remove albums. Add photos to albums from the Photos page.
      </PageTitle>
      <Suspense fallback={<AdminLoading />}>
        <AdminAlbumsContent />
      </Suspense>
    </>
  );
}

async function AdminAlbumsContent() {
  const albums = await getAdminAlbums();
  return (
    <>
      <AlbumManager albums={albums} />
    </>
  );
}

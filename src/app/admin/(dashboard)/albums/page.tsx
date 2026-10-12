import type { Metadata } from "next";
import { AlbumManager } from "@/components/admin/album-manager";
import { PageTitle } from "@/components/admin/ui";
import { getAdminAlbums } from "@/lib/data/admin";

export const metadata: Metadata = { title: "Albums" };

export default async function AdminAlbumsPage() {
  const albums = await getAdminAlbums();
  return (
    <>
      <PageTitle title="Albums">Create, rename, reorder and remove albums. Add photos to albums from the Photos page.</PageTitle>
      <AlbumManager albums={albums} />
    </>
  );
}

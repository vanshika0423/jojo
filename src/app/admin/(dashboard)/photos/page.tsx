import type { Metadata } from "next";
import { Suspense } from "react";
import { PhotoManager } from "@/components/admin/photo-manager";
import { AdminLoading, Card, PageTitle, SetupNotice } from "@/components/admin/ui";
import { Uploader } from "@/components/admin/uploader";
import { isStorageConfigured } from "@/lib/storage/blob";
import { getAdminAlbums, getAdminSettings, listAdminPhotos } from "@/lib/data/admin";

export const metadata: Metadata = { title: "Photos" };

export default function AdminPhotosPage() {
  return (
    <>
      <PageTitle title="Photos">
        Upload, caption, organise and publish photographs. Click a photo to edit it; tick several to change
        them together.
      </PageTitle>
      {!isStorageConfigured ? <SetupNotice service="Vercel Blob" /> : null}
      <Suspense fallback={<AdminLoading />}>
        <AdminPhotosContent />
      </Suspense>
    </>
  );
}

async function AdminPhotosContent() {
  const [albums, initial, settings] = await Promise.all([
    getAdminAlbums(),
    listAdminPhotos({ offset: 0, limit: 60 }),
    getAdminSettings(),
  ]);
  return (
    <>
      <Card className="mb-8">
        <Uploader kind="photo" albums={albums} />
      </Card>
      <PhotoManager albums={albums} initial={initial} hero={settings.hero} />
    </>
  );
}

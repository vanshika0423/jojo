import type { Metadata } from "next";
import { PhotoManager } from "@/components/admin/photo-manager";
import { Card, PageTitle, SetupNotice } from "@/components/admin/ui";
import { Uploader } from "@/components/admin/uploader";
import { isCloudinaryServerConfigured } from "@/lib/cloudinary/server";
import { getAdminAlbums, getAdminSettings, listAdminPhotos } from "@/lib/data/admin";

export const metadata: Metadata = { title: "Photos" };

export default async function AdminPhotosPage() {
  const [albums, initial, settings] = await Promise.all([
    getAdminAlbums(),
    listAdminPhotos({ offset: 0, limit: 60 }),
    getAdminSettings(),
  ]);
  return (
    <>
      <PageTitle title="Photos">
        Upload, caption, organise and publish photographs. Click a photo to edit it; tick several to change
        them together.
      </PageTitle>
      {!isCloudinaryServerConfigured ? <SetupNotice service="Cloudinary" /> : null}
      <Card className="mb-8">
        <Uploader kind="photo" albums={albums} />
      </Card>
      <PhotoManager albums={albums} initial={initial} hero={settings.hero} />
    </>
  );
}

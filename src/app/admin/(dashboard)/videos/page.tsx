import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminLoading, Card, PageTitle, SetupNotice } from "@/components/admin/ui";
import { Uploader } from "@/components/admin/uploader";
import { VideoManager } from "@/components/admin/video-manager";
import { isStorageConfigured } from "@/lib/storage/blob";
import { getAdminAlbums, getAdminVideos } from "@/lib/data/admin";

export const metadata: Metadata = { title: "Videos" };

export default function AdminVideosPage() {
  return (
    <>
      <PageTitle title="Videos">
        Upload videos, set their thumbnails and choose one to feature on the homepage. Videos play exactly as
        uploaded, so shorter clips load fastest.
      </PageTitle>
      {!isStorageConfigured ? <SetupNotice service="Vercel Blob" /> : null}
      <Suspense fallback={<AdminLoading />}>
        <AdminVideosContent />
      </Suspense>
    </>
  );
}

async function AdminVideosContent() {
  const [videos, albums] = await Promise.all([getAdminVideos(), getAdminAlbums()]);
  return (
    <>
      <Card className="mb-8">
        <Uploader kind="video" albums={albums} />
      </Card>
      <VideoManager videos={videos} albums={albums} />
    </>
  );
}

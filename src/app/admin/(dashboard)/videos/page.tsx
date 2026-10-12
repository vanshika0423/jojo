import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminLoading, Card, PageTitle, SetupNotice } from "@/components/admin/ui";
import { Uploader } from "@/components/admin/uploader";
import { VideoManager } from "@/components/admin/video-manager";
import { isCloudinaryServerConfigured } from "@/lib/cloudinary/server";
import { getAdminAlbums, getAdminVideos } from "@/lib/data/admin";

export const metadata: Metadata = { title: "Videos" };

export default function AdminVideosPage() {
  return (
    <>
      <PageTitle title="Videos">
        Upload videos, set their thumbnails and choose one to feature on the homepage. Cloudinary compresses
        each video for smooth playback on phones.
      </PageTitle>
      {!isCloudinaryServerConfigured ? <SetupNotice service="Cloudinary" /> : null}
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

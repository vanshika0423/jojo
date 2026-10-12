import type { Metadata } from "next";
import { Card, PageTitle, SetupNotice } from "@/components/admin/ui";
import { Uploader } from "@/components/admin/uploader";
import { VideoManager } from "@/components/admin/video-manager";
import { isCloudinaryServerConfigured } from "@/lib/cloudinary/server";
import { getAdminAlbums, getAdminVideos } from "@/lib/data/admin";

export const metadata: Metadata = { title: "Videos" };

export default async function AdminVideosPage() {
  const [videos, albums] = await Promise.all([getAdminVideos(), getAdminAlbums()]);
  return (
    <>
      <PageTitle title="Videos">
        Upload videos, set their thumbnails and choose one to feature on the homepage. Cloudinary compresses
        each video for smooth playback on phones.
      </PageTitle>
      {!isCloudinaryServerConfigured ? <SetupNotice service="Cloudinary" /> : null}
      <Card className="mb-8">
        <Uploader kind="video" albums={albums} />
      </Card>
      <VideoManager videos={videos} albums={albums} />
    </>
  );
}

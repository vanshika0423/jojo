import type { Metadata } from "next";
import { PageHeader } from "@/components/site/section-heading";
import { VideoGallery } from "@/components/video/video-gallery";
import { getAlbums, getVideos } from "@/lib/data/public";
import { placeholderVideos } from "@/lib/data/placeholders";

export const metadata: Metadata = {
  title: "Jojo in Motion",
  description: "Videos of Jojo — playing, exploring, and being himself.",
  alternates: { canonical: "/videos" },
};

export default async function VideosPage() {
  const [videos, albums] = await Promise.all([getVideos(), getAlbums()]);
  const empty = videos.length === 0;

  return (
    <>
      <PageHeader eyebrow="Videos" title="Jojo in Motion">
        {empty ? <p>His videos will appear here once they are uploaded and published.</p> : null}
      </PageHeader>
      <div className="mx-auto max-w-7xl px-5 pb-28 sm:px-8">
        <VideoGallery videos={empty ? placeholderVideos(3) : videos} albums={albums} />
      </div>
    </>
  );
}

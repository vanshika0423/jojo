import type { Metadata } from "next";
import { TimelineEditor } from "@/components/admin/timeline-editor";
import { PageTitle } from "@/components/admin/ui";
import { getAdminTimeline, getAdminVideos } from "@/lib/data/admin";

export const metadata: Metadata = { title: "Timeline" };

export default async function AdminTimelinePage() {
  const [events, videos] = await Promise.all([getAdminTimeline(), getAdminVideos()]);
  return (
    <>
      <PageTitle title="Timeline">Milestones are shown in date order, grouped by year.</PageTitle>
      <TimelineEditor events={events} videos={videos} />
    </>
  );
}

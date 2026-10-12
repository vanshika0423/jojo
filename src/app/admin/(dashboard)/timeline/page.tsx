import type { Metadata } from "next";
import { Suspense } from "react";
import { TimelineEditor } from "@/components/admin/timeline-editor";
import { AdminLoading, PageTitle } from "@/components/admin/ui";
import { getAdminTimeline, getAdminVideos } from "@/lib/data/admin";

export const metadata: Metadata = { title: "Timeline" };

export default function AdminTimelinePage() {
  return (
    <>
      <PageTitle title="Timeline">Milestones are shown in date order, grouped by year.</PageTitle>
      <Suspense fallback={<AdminLoading />}>
        <AdminTimelineContent />
      </Suspense>
    </>
  );
}

async function AdminTimelineContent() {
  const [events, videos] = await Promise.all([getAdminTimeline(), getAdminVideos()]);
  return (
    <>
      <TimelineEditor events={events} videos={videos} />
    </>
  );
}

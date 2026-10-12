import type { Metadata } from "next";
import { PageHeader } from "@/components/site/section-heading";
import { TimelineView } from "@/components/timeline/timeline-view";
import { getSettings, getTimeline } from "@/lib/data/public";

export const metadata: Metadata = {
  title: "Memory Timeline",
  description: "Jojo's life, chapter by chapter — beginning on 11 March 2017.",
  alternates: { canonical: "/timeline" },
};

export default async function TimelinePage() {
  const [events, settings] = await Promise.all([getTimeline(), getSettings()]);
  return (
    <>
      <PageHeader eyebrow="Timeline" title="A Life in Moments">
        <p>From March 2017, onwards — forever.</p>
      </PageHeader>
      <TimelineView events={events} allowDownloads={settings.features.allowDownloads} />
    </>
  );
}

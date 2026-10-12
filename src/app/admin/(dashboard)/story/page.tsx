import type { Metadata } from "next";
import { Suspense } from "react";
import { StoryEditor } from "@/components/admin/section-editors";
import { AdminLoading, PageTitle } from "@/components/admin/ui";
import { getAdminStory } from "@/lib/data/admin";

export const metadata: Metadata = { title: "His Story" };

export default function AdminStoryPage() {
  return (
    <>
      <PageTitle title="His Story">
        Each chapter appears on the “His Story” page with a large photograph. Click a chapter to write it.
      </PageTitle>
      <Suspense fallback={<AdminLoading />}>
        <AdminStoryContent />
      </Suspense>
    </>
  );
}

async function AdminStoryContent() {
  const sections = await getAdminStory();
  return (
    <>
      <StoryEditor sections={sections} />
    </>
  );
}

import type { Metadata } from "next";
import { StoryEditor } from "@/components/admin/section-editors";
import { PageTitle } from "@/components/admin/ui";
import { getAdminStory } from "@/lib/data/admin";

export const metadata: Metadata = { title: "His Story" };

export default async function AdminStoryPage() {
  const sections = await getAdminStory();
  return (
    <>
      <PageTitle title="His Story">Each chapter appears on the “His Story” page with a large photograph. Click a chapter to write it.</PageTitle>
      <StoryEditor sections={sections} />
    </>
  );
}

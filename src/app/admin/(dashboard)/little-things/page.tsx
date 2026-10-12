import type { Metadata } from "next";
import { LittleThingsEditor } from "@/components/admin/section-editors";
import { PageTitle } from "@/components/admin/ui";
import { getAdminLittleThings } from "@/lib/data/admin";

export const metadata: Metadata = { title: "Little Things" };

export default async function AdminLittleThingsPage() {
  const things = await getAdminLittleThings();
  return (
    <>
      <PageTitle title="Little Things">
        The playful cards about Jojo’s favourite things. The first four also appear on the homepage.
      </PageTitle>
      <LittleThingsEditor things={things} />
    </>
  );
}

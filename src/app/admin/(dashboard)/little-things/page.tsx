import type { Metadata } from "next";
import { Suspense } from "react";
import { LittleThingsEditor } from "@/components/admin/section-editors";
import { AdminLoading, PageTitle } from "@/components/admin/ui";
import { getAdminLittleThings } from "@/lib/data/admin";

export const metadata: Metadata = { title: "Little Things" };

export default function AdminLittleThingsPage() {
  return (
    <>
      <PageTitle title="Little Things">
        The playful cards about Jojo’s favourite things. The first four also appear on the homepage.
      </PageTitle>
      <Suspense fallback={<AdminLoading />}>
        <AdminLittleThingsContent />
      </Suspense>
    </>
  );
}

async function AdminLittleThingsContent() {
  const things = await getAdminLittleThings();
  return (
    <>
      <LittleThingsEditor things={things} />
    </>
  );
}

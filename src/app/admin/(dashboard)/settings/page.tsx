import type { Metadata } from "next";
import { Suspense } from "react";
import { SettingsForm } from "@/components/admin/settings-form";
import { AdminLoading, PageTitle } from "@/components/admin/ui";
import { getAdminSettings } from "@/lib/data/admin";

export const metadata: Metadata = { title: "Homepage & Settings" };

export default function AdminSettingsPage() {
  return (
    <>
      <PageTitle title="Homepage & Settings">
        Change the homepage photograph and words, and how visitors can interact with the site.
      </PageTitle>
      <Suspense fallback={<AdminLoading />}>
        <AdminSettingsContent />
      </Suspense>
    </>
  );
}

async function AdminSettingsContent() {
  const s = await getAdminSettings();
  return (
    <>
      <SettingsForm hero={s.hero} heroPhoto={s.heroPhoto} home={s.home} features={s.features} />
    </>
  );
}

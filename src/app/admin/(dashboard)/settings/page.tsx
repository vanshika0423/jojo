import type { Metadata } from "next";
import { SettingsForm } from "@/components/admin/settings-form";
import { PageTitle } from "@/components/admin/ui";
import { getAdminSettings } from "@/lib/data/admin";

export const metadata: Metadata = { title: "Homepage & Settings" };

export default async function AdminSettingsPage() {
  const s = await getAdminSettings();
  return (
    <>
      <PageTitle title="Homepage & Settings">Change the homepage photograph and words, and how visitors can interact with the site.</PageTitle>
      <SettingsForm hero={s.hero} heroPhoto={s.heroPhoto} home={s.home} features={s.features} />
    </>
  );
}

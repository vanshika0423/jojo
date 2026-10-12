import type { Metadata } from "next";
import { Suspense } from "react";
import { LettersManager } from "@/components/admin/letters-manager";
import { AdminLoading, PageTitle } from "@/components/admin/ui";
import { getAdminLetters } from "@/lib/data/admin";

export const metadata: Metadata = { title: "Letters" };

export default function AdminLettersPage() {
  return (
    <>
      <PageTitle title="Letters">
        Letters sent from the website wait here for your approval. Private letters are never shown on the
        website.
      </PageTitle>
      <Suspense fallback={<AdminLoading />}>
        <AdminLettersContent />
      </Suspense>
    </>
  );
}

async function AdminLettersContent() {
  const letters = await getAdminLetters();
  return (
    <>
      <LettersManager letters={letters} />
    </>
  );
}

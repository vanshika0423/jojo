import type { Metadata } from "next";
import { LettersManager } from "@/components/admin/letters-manager";
import { PageTitle } from "@/components/admin/ui";
import { getAdminLetters } from "@/lib/data/admin";

export const metadata: Metadata = { title: "Letters" };

export default async function AdminLettersPage() {
  const letters = await getAdminLetters();
  return (
    <>
      <PageTitle title="Letters">
        Letters sent from the website wait here for your approval. Private letters are never shown on the
        website.
      </PageTitle>
      <LettersManager letters={letters} />
    </>
  );
}

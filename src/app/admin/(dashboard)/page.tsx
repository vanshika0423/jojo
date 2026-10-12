import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { AdminLoading, Card, PageTitle, SetupNotice } from "@/components/admin/ui";
import { isStorageConfigured } from "@/lib/storage/blob";
import { getOverview } from "@/lib/data/admin";

export const metadata: Metadata = { title: "Overview" };

export default function AdminOverviewPage() {
  return (
    <>
      <PageTitle title="Welcome back">
        Everything on the website can be changed from here. Nothing is published until you choose to publish
        it.
      </PageTitle>
      {!isStorageConfigured ? <SetupNotice service="Vercel Blob" /> : null}
      <Suspense fallback={<AdminLoading />}>
        <AdminOverviewContent />
      </Suspense>
    </>
  );
}

async function AdminOverviewContent() {
  const o = await getOverview();
  const stats = [
    { label: "Photos", value: o.photos, note: `${o.publishedPhotos} published`, href: "/admin/photos" },
    { label: "Videos", value: o.videos, href: "/admin/videos" },
    { label: "Albums", value: o.albums, href: "/admin/albums" },
    { label: "Milestones", value: o.events, href: "/admin/timeline" },
    { label: "Letters to review", value: o.pendingLetters, href: "/admin/letters" },
  ];
  const tasks = [
    {
      href: "/admin/photos",
      title: "Upload photos",
      text: "Drag in as many as you like. They stay as drafts until you publish them.",
    },
    {
      href: "/admin/settings",
      title: "Choose the homepage photo",
      text: "Pick the photograph that greets every visitor, and write the introduction.",
    },
    {
      href: "/admin/story",
      title: "Write his story",
      text: "Six chapters are ready and waiting for your words.",
    },
    {
      href: "/admin/little-things",
      title: "Fill in the little things",
      text: "Favourite food, toy, walks, habits…",
    },
    {
      href: "/admin/timeline",
      title: "Add milestones",
      text: "Dates, stories, photos and videos from his life.",
    },
    {
      href: "/admin/videos",
      title: "Upload videos",
      text: "Choose a thumbnail and feature one on the homepage.",
    },
  ];
  return (
    <>
      <ul className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {stats.map((s) => (
          <li key={s.label}>
            <Link
              href={s.href}
              className="hover:bg-cream/50 block rounded-2xl bg-white p-5 shadow-[0_1px_2px_rgba(81,68,60,0.08)]"
            >
              <span className="text-cocoa block font-serif text-4xl">{s.value}</span>
              <span className="text-cocoa/70 mt-1 block text-sm">{s.label}</span>
              {s.note ? <span className="text-taupe-dark text-xs">{s.note}</span> : null}
            </Link>
          </li>
        ))}
      </ul>
      <h2 className="text-cocoa mt-10 mb-4 text-2xl">Things you can do</h2>
      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {tasks.map((t) => (
          <li key={t.href}>
            <Link href={t.href} className="block h-full">
              <Card className="hover:bg-cream/40 h-full transition-colors">
                <p className="text-cocoa font-serif text-xl">{t.title} →</p>
                <p className="text-cocoa/70 mt-1 text-sm">{t.text}</p>
              </Card>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}

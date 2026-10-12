import Link from "next/link";
import { Suspense } from "react";
import { signOut } from "@/app/admin/actions/auth";
import { AdminNav } from "@/components/admin/admin-nav";
import { Toaster } from "@/components/admin/toast";
import { AdminLoading } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/auth";

async function AdminGate({ children }: { children: React.ReactNode }) {
  // Re-checked here (not just in the proxy): the user must be in public.admins.
  await requireAdmin();
  return <>{children}</>;
}

async function SignedInAs() {
  const admin = await requireAdmin();
  return <p className="text-taupe-dark truncate text-xs">{admin.email}</p>;
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="lg:flex">
      <aside className="border-taupe/25 bg-ivory/95 sticky top-0 z-40 border-b px-4 py-3 backdrop-blur lg:h-dvh lg:w-64 lg:shrink-0 lg:border-r lg:border-b-0 lg:px-5 lg:py-8">
        <div className="mb-3 flex items-center justify-between lg:mb-8 lg:block">
          <Link href="/admin" className="text-cocoa font-serif text-2xl">
            Forever Jojo <span aria-hidden>∞</span>
          </Link>
          <div className="flex items-center gap-2 lg:mt-4 lg:flex-col lg:items-start">
            <Suspense fallback={null}>
              <div className="hidden lg:block">
                <SignedInAs />
              </div>
            </Suspense>
            <div className="flex gap-2">
              <Link
                href="/"
                target="_blank"
                className="text-cocoa/70 hover:bg-cream rounded-full px-3 py-1.5 text-xs"
              >
                View site ↗
              </Link>
              <form action={signOut}>
                <button
                  type="submit"
                  className="text-cocoa/70 hover:bg-cream rounded-full px-3 py-1.5 text-xs"
                >
                  Sign out
                </button>
              </form>
            </div>
          </div>
        </div>
        <AdminNav />
      </aside>
      <main className="min-w-0 flex-1 px-4 py-8 sm:px-8 lg:px-12 lg:py-10">
        <Suspense fallback={<AdminLoading />}>
          <AdminGate>{children}</AdminGate>
        </Suspense>
      </main>
      <Toaster />
    </div>
  );
}

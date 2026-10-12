import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "@/components/admin/login-form";
import { isAuthConfigured } from "@/lib/auth";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-5 py-16">
      <div className="w-full max-w-sm">
        <Link href="/" className="text-cocoa block text-center font-serif text-3xl">
          Forever Jojo <span aria-hidden>∞</span>
        </Link>
        <p className="eyebrow mt-3 text-center">Family dashboard</p>
        <div className="mt-10 rounded-3xl bg-white p-7 shadow-[0_20px_60px_-35px_rgba(58,48,42,0.5)]">
          {isAuthConfigured ? (
            <LoginForm />
          ) : (
            <div className="text-cocoa/80 space-y-3 text-sm">
              <p className="text-cocoa font-medium">Almost there.</p>
              <p>
                Sign-in will work once the PostgreSQL database is connected. Add <code>DATABASE_URL</code> to{" "}
                <code>.env.local</code> (see <code>.env.example</code>), run <code>npm run db:migrate</code>{" "}
                and <code>npm run db:create-admin</code>, then restart the site.
              </p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

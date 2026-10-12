import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "@/components/admin/login-form";
import { isSupabaseConfigured } from "@/lib/env";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-5 py-16">
      <div className="w-full max-w-sm">
        <Link href="/" className="block text-center font-serif text-3xl text-cocoa">
          Forever Jojo <span aria-hidden>∞</span>
        </Link>
        <p className="eyebrow mt-3 text-center">Family dashboard</p>
        <div className="mt-10 rounded-3xl bg-white p-7 shadow-[0_20px_60px_-35px_rgba(58,48,42,0.5)]">
          {isSupabaseConfigured ? (
            <LoginForm />
          ) : (
            <div className="space-y-3 text-sm text-cocoa/80">
              <p className="font-medium text-cocoa">Almost there.</p>
              <p>
                Sign-in will work once Supabase is connected. Add the Supabase variables from{" "}
                <code>.env.example</code> and follow the setup steps in <code>README.md</code>.
              </p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

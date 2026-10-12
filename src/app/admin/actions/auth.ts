"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { authProvider, endSession, isAuthConfigured, signInWithPassword } from "@/lib/auth";
import { db } from "@/lib/db";
import { getServerClient } from "@/lib/supabase/server";

export type SignInState = { error?: string; email?: string };

const credentials = z.object({
  email: z.email(),
  password: z.string().min(1).max(200),
});

const WRONG = "That email and password didn’t work. Please try again.";

export async function signIn(_: SignInState, formData: FormData): Promise<SignInState> {
  if (!isAuthConfigured) {
    return { error: "The database isn’t connected yet. See the setup guide in README.md." };
  }
  const parsed = credentials.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  const typedEmail = String(formData.get("email") ?? "").slice(0, 320);
  if (!parsed.success) return { error: "Please enter a valid email and password.", email: typedEmail };
  const { email, password } = parsed.data;

  if (authProvider === "supabase") {
    const supabase = await getServerClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    // Same message for every failure so accounts can't be probed.
    if (error) return { error: WRONG, email };
    const [admin] = await db()!`select 1 from public.admin_users where email = ${email.toLowerCase()}`;
    if (!admin) {
      await supabase.auth.signOut();
      return { error: "This account isn’t an administrator. Ask the site owner to add you.", email };
    }
  } else if (!(await signInWithPassword(email, password))) {
    // Slow down repeated guessing a little.
    await new Promise((r) => setTimeout(r, 600));
    return { error: WRONG, email };
  }
  redirect("/admin");
}

export async function signOut() {
  if (authProvider === "supabase") {
    const supabase = await getServerClient();
    await supabase.auth.signOut();
  } else {
    await endSession();
  }
  redirect("/admin/login");
}

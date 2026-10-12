"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { isSupabaseConfigured } from "@/lib/env";
import { getServerClient } from "@/lib/supabase/server";

export type SignInState = { error?: string };

const credentials = z.object({
  email: z.email(),
  password: z.string().min(6).max(200),
});

export async function signIn(_: SignInState, formData: FormData): Promise<SignInState> {
  if (!isSupabaseConfigured) {
    return { error: "Supabase isn’t configured yet. See the setup guide in README.md." };
  }
  const parsed = credentials.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: "Please enter a valid email and password." };

  const supabase = await getServerClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    // Same message for every failure so accounts can't be probed.
    return { error: "That email and password didn’t work. Please try again." };
  }
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (isAdmin !== true) {
    await supabase.auth.signOut();
    return { error: "This account isn’t an administrator. Ask the site owner to add you." };
  }
  redirect("/admin");
}

export async function signOut() {
  const supabase = await getServerClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}

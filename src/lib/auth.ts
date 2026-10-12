import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { isSupabaseConfigured } from "@/lib/env";
import { getServerClient } from "@/lib/supabase/server";

export type AdminUser = { id: string; email: string | null };

/**
 * Returns the signed-in admin, or null. The JWT is verified via getClaims()
 * and admin membership is checked in the database — never trust the client.
 */
export const getAdmin = cache(async function getAdmin(): Promise<AdminUser | null> {
  // Always a request-time decision, never part of a prerendered shell.
  await connection();
  if (!isSupabaseConfigured) return null;
  const supabase = await getServerClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims?.sub) return null;

  const { data: isAdmin, error: rpcError } = await supabase.rpc("is_admin");
  if (rpcError || isAdmin !== true) return null;

  return {
    id: data.claims.sub,
    email: typeof data.claims.email === "string" ? data.claims.email : null,
  };
});

/** For pages: send anyone who is not an admin to the sign-in screen. */
export async function requireAdmin(): Promise<AdminUser> {
  const admin = await getAdmin();
  if (!admin) redirect("/admin/login");
  return admin;
}

export class UnauthorizedError extends Error {
  constructor() {
    super("You need to be signed in as an administrator to do that.");
  }
}

/** For server actions: throw instead of redirecting. */
export async function assertAdmin(): Promise<AdminUser> {
  const admin = await getAdmin();
  if (!admin) throw new UnauthorizedError();
  return admin;
}

import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { db, isDatabaseConfigured } from "@/lib/db";
import { isSupabaseAuth, siteUrl } from "@/lib/env";
import { verifyPassword } from "@/lib/password";
import { getServerClient } from "@/lib/supabase/server";

// Two ways to sign in, one list of administrators (public.admin_users):
//   * built-in (default): email + password checked against admin_users,
//     with a random session token in an httpOnly cookie;
//   * Supabase Auth: used when NEXT_PUBLIC_SUPABASE_* keys are set; the
//     Supabase account's email must also be listed in admin_users.

export type AdminUser = { id: string; email: string };

export const SESSION_COOKIE = "jojo_session";
const SESSION_DAYS = 30;

const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");

export const authProvider = isSupabaseAuth ? "supabase" : "builtin";

/** Ready when there is a database (and, for Supabase sign-in, its keys). */
export const isAuthConfigured = isDatabaseConfigured;

async function findAdminByEmail(email: string) {
  const sql = db();
  if (!sql) return null;
  const [row] = await sql<{ id: string; email: string; password_hash: string | null }[]>`
    select id, email, password_hash from public.admin_users where email = ${email.trim().toLowerCase()}`;
  return row ?? null;
}

/** The signed-in administrator, or null. Always decided per request. */
export const getAdmin = cache(async function getAdmin(): Promise<AdminUser | null> {
  await connection();
  const sql = db();
  if (!sql) return null;

  if (authProvider === "supabase") {
    const supabase = await getServerClient();
    const { data, error } = await supabase.auth.getClaims();
    const email = typeof data?.claims?.email === "string" ? data.claims.email : null;
    if (error || !email) return null;
    const admin = await findAdminByEmail(email);
    return admin ? { id: admin.id, email: admin.email } : null;
  }

  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token || token.length > 200) return null;
  const [row] = await sql<AdminUser[]>`
    select u.id, u.email
    from public.admin_sessions s join public.admin_users u on u.id = s.admin_id
    where s.token_hash = ${sha256(token)} and s.expires_at > now()`;
  return row ?? null;
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

/** Built-in sign-in. Returns false for any wrong email/password combination. */
export async function signInWithPassword(email: string, password: string): Promise<boolean> {
  const sql = db();
  if (!sql) return false;
  const admin = await findAdminByEmail(email);
  const valid = await verifyPassword(password, admin?.password_hash);
  if (!admin || !valid) return false;

  const token = randomBytes(32).toString("base64url");
  const expires = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await sql`delete from public.admin_sessions where expires_at < now()`;
  await sql`
    insert into public.admin_sessions (token_hash, admin_id, expires_at)
    values (${sha256(token)}, ${admin.id}, ${expires})`;
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    // HTTPS-only in production, unless the site is deliberately served over http.
    secure: process.env.NODE_ENV === "production" && !siteUrl.startsWith("http://"),
    sameSite: "lax",
    path: "/",
    expires,
  });
  return true;
}

export async function endSession() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  const sql = db();
  if (token && sql) await sql`delete from public.admin_sessions where token_hash = ${sha256(token)}`;
  store.delete(SESSION_COOKIE);
}

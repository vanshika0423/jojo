import "server-only";
import { refresh, updateTag } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { assertAdmin, UnauthorizedError } from "@/lib/auth";
import type { CacheTag } from "@/lib/data/tags";
import { getServerClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types";

export class UserFacingError extends Error {}

/**
 * Every admin mutation goes through here: it verifies the admin, validates
 * input, runs the work with the user's (RLS-checked) client, refreshes the
 * public caches and the dashboard, and turns failures into friendly messages.
 */
export async function runAdmin<S extends z.ZodType, T = undefined>(
  schema: S,
  input: unknown,
  tags: CacheTag[],
  work: (data: z.infer<S>, supabase: SupabaseClient) => Promise<T>,
): Promise<ActionResult<T>> {
  try {
    await assertAdmin();
    const parsed = schema.safeParse(input);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      const field = issue?.path.join(".");
      return { ok: false, error: `Please check ${field ? `“${field}”` : "the form"}: ${issue?.message ?? "invalid value"}` };
    }
    const supabase = await getServerClient();
    const data = await work(parsed.data, supabase);
    for (const tag of tags) updateTag(tag);
    refresh();
    return (data === undefined ? { ok: true } : { ok: true, data }) as ActionResult<T>;
  } catch (error) {
    if (error instanceof UnauthorizedError || error instanceof UserFacingError) {
      return { ok: false, error: error.message };
    }
    console.error("[admin] action failed", error);
    return { ok: false, error: "Something went wrong while saving. Please try again." };
  }
}

/**
 * Throw a readable error when Supabase reports one. When there is no error the
 * data is present (or irrelevant, for writes without `.select()`).
 */
export function check<T>(
  result: { data: T; error: { message: string; code?: string } | null },
  what: string,
): NonNullable<T> {
  if (result.error) {
    if (result.error.code === "23505") throw new UserFacingError(`That ${what} already exists.`);
    console.error(`[admin] ${what}`, result.error);
    throw new UserFacingError(`Couldn’t save the ${what}. Please try again.`);
  }
  return result.data as NonNullable<T>;
}

export const uuid = z.uuid();
export const isoDate = z.iso.date();
export const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => (v === "" ? null : v))
    .nullable();

import "server-only";
import { refresh, updateTag } from "next/cache";
import { z } from "zod";
import { assertAdmin, UnauthorizedError } from "@/lib/auth";
import type { CacheTag } from "@/lib/data/tags";
import { requireDb, type Sql } from "@/lib/db";
import type { ActionResult } from "@/lib/types";

export class UserFacingError extends Error {}

/**
 * Every admin mutation goes through here: it verifies the admin, validates
 * input, runs the work inside one database transaction, refreshes the public
 * caches and the dashboard, and turns failures into friendly messages.
 */
export async function runAdmin<S extends z.ZodType, T = undefined>(
  schema: S,
  input: unknown,
  tags: CacheTag[],
  work: (data: z.infer<S>, sql: Sql, afterCommit: (task: () => Promise<void>) => void) => Promise<T>,
): Promise<ActionResult<T>> {
  try {
    await assertAdmin();
    const parsed = schema.safeParse(input);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      const field = issue?.path.join(".");
      return {
        ok: false,
        error: `Please check ${field ? `“${field}”` : "the form"}: ${issue?.message ?? "invalid value"}`,
      };
    }
    // All-or-nothing: a failure part-way leaves the database untouched.
    // Side effects outside the database (deleting files) run only after commit.
    const later: Array<() => Promise<void>> = [];
    const data = (await requireDb().begin((tx) =>
      work(parsed.data, tx as unknown as Sql, (task) => later.push(task)),
    )) as T;
    await Promise.all(later.map((task) => task()));
    for (const tag of tags) updateTag(tag);
    refresh();
    return (data === undefined ? { ok: true } : { ok: true, data }) as ActionResult<T>;
  } catch (error) {
    if (error instanceof UnauthorizedError || error instanceof UserFacingError) {
      return { ok: false, error: error.message };
    }
    const code = (error as { code?: string })?.code;
    if (code === "23505")
      return { ok: false, error: "That already exists — please choose a different name." };
    if (code === "23503")
      return { ok: false, error: "Something it refers to no longer exists. Please refresh." };
    console.error("[admin] action failed", error);
    return { ok: false, error: "Something went wrong while saving. Please try again." };
  }
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

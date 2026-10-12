"use server";

import { z } from "zod";
import { getSettings } from "@/lib/data/public";
import { db } from "@/lib/db";

export type SubmitLetterState = { status: "idle" | "success" | "error"; message?: string };

const letterSchema = z.object({
  authorName: z
    .string()
    .trim()
    .min(1, "Please add your name.")
    .max(100, "Please keep your name under 100 characters."),
  body: z
    .string()
    .trim()
    .min(10, "Your letter is a little short.")
    .max(10_000, "Please keep your letter under 10,000 characters."),
  visibility: z.enum(["public", "private"]),
  // Spam traps: a hidden field people never fill, and a minimum time on page.
  website: z.string().max(0),
  startedAt: z.coerce.number().int(),
});

export async function submitLetter(_: SubmitLetterState, formData: FormData): Promise<SubmitLetterState> {
  const parsed = letterSchema.safeParse({
    authorName: formData.get("authorName"),
    body: formData.get("body"),
    visibility: formData.get("visibility"),
    website: formData.get("website") ?? "",
    startedAt: formData.get("startedAt"),
  });
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Please check the form." };
  }
  const { authorName, body, visibility, startedAt } = parsed.data;
  if (Date.now() - startedAt < 3000) {
    return { status: "error", message: "Please take a moment before sending." };
  }

  const settings = await getSettings();
  const sql = db();
  if (!settings.features.lettersOpen || !sql) {
    return { status: "error", message: "Letters can’t be received right now." };
  }

  // Visitors can only ever create *pending* letters; the family approves them.
  try {
    await sql`
      insert into public.letters (author_name, body, visibility, status)
      values (${authorName}, ${body}, ${visibility}, 'pending')`;
  } catch (error) {
    console.error("[letters] submit failed", error);
    return { status: "error", message: "Something went wrong. Please try again in a moment." };
  }
  return {
    status: "success",
    message:
      visibility === "public"
        ? "Thank you. Your letter will appear here once the family has read it."
        : "Thank you. Your letter has been delivered privately to the family.",
  };
}

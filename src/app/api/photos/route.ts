import type { NextRequest } from "next/server";
import { z } from "zod";
import { getPhotoPage, searchPhotos } from "@/lib/data/public";
import { GALLERY_PAGE_SIZE } from "@/lib/gallery";

const querySchema = z.object({
  album: z
    .string()
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/)
    .max(80)
    .optional(),
  favourites: z.enum(["1"]).optional(),
  q: z.string().max(100).optional(),
  offset: z.coerce.number().int().min(0).max(100_000).default(0),
});

/** Public, read-only paging for the gallery. Only published photos are returned. */
export async function GET(request: NextRequest) {
  const parsed = querySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!parsed.success) {
    return Response.json({ error: "Invalid query" }, { status: 400 });
  }
  const { album, favourites, q, offset } = parsed.data;
  const query = { album: album ?? null, favourites: favourites === "1", offset, limit: GALLERY_PAGE_SIZE };
  const page = q?.trim() ? await searchPhotos({ ...query, q }) : await getPhotoPage(query);
  return Response.json(page, {
    headers: {
      "Cache-Control": q ? "no-store" : "public, s-maxage=60, stale-while-revalidate=600",
    },
  });
}

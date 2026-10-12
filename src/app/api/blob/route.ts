import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { getAdmin } from "@/lib/auth";
import { uploadLimits } from "@/lib/env";
import { isStorageConfigured, parseUploadPath } from "@/lib/storage/blob";

const MB = 1024 * 1024;

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"];
const VIDEO_TYPES = ["video/mp4", "video/quicktime", "video/webm", "video/x-m4v", "video/3gpp"];

/**
 * Issues short-lived upload tokens so the dashboard can send files straight to
 * Vercel Blob. Only signed-in admins get a token, and each token is limited to
 * one validated path, its file types and a maximum size.
 */
export async function POST(request: Request) {
  if (!isStorageConfigured) {
    return Response.json(
      { error: "File storage isn’t set up yet: add BLOB_READ_WRITE_TOKEN (see README)." },
      { status: 503 },
    );
  }
  const body = (await request.json()) as HandleUploadBody;
  try {
    const result = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        if (!(await getAdmin())) throw new Error("Please sign in again.");
        const path = parseUploadPath(pathname);
        if (!path) throw new Error("Invalid upload path.");
        const isVideoFile = path.kind === "videos" && path.file.startsWith("video.");
        return {
          allowedContentTypes: isVideoFile ? VIDEO_TYPES : IMAGE_TYPES,
          maximumSizeInBytes: (isVideoFile ? uploadLimits.videoMb : uploadLimits.imageMb) * MB,
          addRandomSuffix: false,
          allowOverwrite: false,
          cacheControlMaxAge: 60 * 60 * 24 * 365,
        };
      },
    });
    return Response.json(result);
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Upload refused." },
      { status: 400 },
    );
  }
}

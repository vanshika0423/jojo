import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";
import { v2 as cloudinary } from "cloudinary";
import { VIDEO_RENDITIONS } from "@/lib/cloudinary/urls";
import { cloudinaryCloudName } from "@/lib/env";

const apiKey = process.env.CLOUDINARY_API_KEY ?? "";
const apiSecret = process.env.CLOUDINARY_API_SECRET ?? "";

export const UPLOAD_ROOT = (process.env.CLOUDINARY_FOLDER || "forever-jojo").replace(
  /[^a-z0-9-_/]/gi,
  "",
);

export const isCloudinaryServerConfigured = Boolean(
  cloudinaryCloudName && apiKey && apiSecret,
);

cloudinary.config({
  cloud_name: cloudinaryCloudName,
  api_key: apiKey,
  api_secret: apiSecret,
  secure: true,
});

export type UploadKind = "photo" | "video" | "poster";

const folders: Record<UploadKind, string> = {
  photo: `${UPLOAD_ROOT}/photos`,
  video: `${UPLOAD_ROOT}/videos`,
  poster: `${UPLOAD_ROOT}/posters`,
};

export function folderFor(kind: UploadKind) {
  return folders[kind];
}

/**
 * Signed parameters for a direct browser → Cloudinary upload. The API secret
 * never leaves the server; the signature only authorises these exact params.
 */
export function signUpload(kind: UploadKind) {
  const timestamp = Math.round(Date.now() / 1000);
  const params: Record<string, string | number> = {
    folder: folders[kind],
    timestamp,
    use_filename: "true",
    unique_filename: "true",
  };
  if (kind === "video") {
    params.eager = Object.values(VIDEO_RENDITIONS)
      .map((t) => `${t}/mp4`)
      .join("|");
    params.eager_async = "true";
  }
  const signature = cloudinary.utils.api_sign_request(params, apiSecret);
  return {
    cloudName: cloudinaryCloudName,
    apiKey,
    resourceType: kind === "video" ? ("video" as const) : ("image" as const),
    params,
    signature,
  };
}

/** Confirms an upload response really came from Cloudinary for our account. */
export function verifyUploadSignature(publicId: string, version: number, signature: string) {
  const expected = createHash("sha1")
    .update(`public_id=${publicId}&version=${version}${apiSecret}`)
    .digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function isOwnPublicId(publicId: string, kind: UploadKind) {
  return publicId.startsWith(`${folders[kind]}/`) && !publicId.includes("..");
}

export async function destroyAsset(publicId: string, resourceType: "image" | "video") {
  try {
    await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
      invalidate: true,
    });
  } catch (error) {
    // The database is the source of truth; a leftover file is harmless.
    console.error("Cloudinary delete failed", publicId, error);
  }
}

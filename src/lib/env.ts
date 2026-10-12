// Public configuration. Only NEXT_PUBLIC_* values may be read here because
// this module is imported by client components too.

export const siteUrl = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000")
).replace(/\/$/, "");

export const supabaseUrl = realValue(process.env.NEXT_PUBLIC_SUPABASE_URL);
export const supabasePublishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/** Treat the example values from .env.example as "not set". */
export function realValue(value: string | undefined) {
  const v = (value ?? "").trim();
  return /^your[-_]|your-project-ref|x{6,}|^0+$/i.test(v) ? "" : v;
}

export const cloudinaryCloudName = realValue(process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME);

/** Supabase is optional: when its keys are set, sign-in uses Supabase Auth. */
export const isSupabaseAuth = Boolean(supabaseUrl && supabasePublishableKey);

export const isCloudinaryConfigured = Boolean(cloudinaryCloudName);

function readMb(value: string | undefined, fallback: number) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/** Upload limits shown in the dashboard. Match them to your Cloudinary plan. */
export const uploadLimits = {
  imageMb: readMb(process.env.NEXT_PUBLIC_MAX_IMAGE_UPLOAD_MB, 10),
  videoMb: readMb(process.env.NEXT_PUBLIC_MAX_VIDEO_UPLOAD_MB, 100),
};

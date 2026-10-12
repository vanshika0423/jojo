import { z } from "zod";

// Everything here is publicly readable — never put secrets in site settings.

export const heroSettingsSchema = z.object({
  photoId: z.uuid().nullable(),
  title: z.string().trim().min(1).max(80),
  dates: z.string().trim().min(1).max(80),
  tagline: z.string().trim().max(200),
  cta: z.string().trim().min(1).max(40),
});

export const homeSettingsSchema = z.object({
  introHeading: z.string().trim().max(120),
  introBody: z.string().trim().max(4000),
  littleThingsIntro: z.string().trim().max(600),
  finalHeading: z.string().trim().min(1).max(120),
  finalBody: z.string().trim().max(1000),
});

export const featureSettingsSchema = z.object({
  allowDownloads: z.boolean(),
  lettersOpen: z.boolean(),
});

export type HeroSettings = z.infer<typeof heroSettingsSchema>;
export type HomeSettings = z.infer<typeof homeSettingsSchema>;
export type FeatureSettings = z.infer<typeof featureSettingsSchema>;

export type SiteSettings = {
  hero: HeroSettings;
  home: HomeSettings;
  features: FeatureSettings;
};

export const defaultSettings: SiteSettings = {
  hero: {
    photoId: null,
    title: "Jojo ♾️",
    dates: "11 March 2017 — Forever",
    tagline: "Some souls leave paw prints on everything we become.",
    cta: "Explore His World",
  },
  home: {
    introHeading: "Meet Jojo",
    // Left empty on purpose: the family writes this in the dashboard.
    introBody: "",
    littleThingsIntro: "",
    finalHeading: "Forever our Jojo ♾️",
    finalBody: "",
  },
  features: {
    allowDownloads: false,
    lettersOpen: true,
  },
};

export const settingsSchemas = {
  hero: heroSettingsSchema,
  home: homeSettingsSchema,
  features: featureSettingsSchema,
} as const;

export type SettingsKey = keyof typeof settingsSchemas;

/** Merge a stored JSON value over the defaults, ignoring anything invalid. */
export function parseSetting<K extends SettingsKey>(key: K, value: unknown): SiteSettings[K] {
  const merged = {
    ...defaultSettings[key],
    ...(value && typeof value === "object" ? value : {}),
  };
  const parsed = settingsSchemas[key].safeParse(merged);
  return (parsed.success ? parsed.data : defaultSettings[key]) as SiteSettings[K];
}

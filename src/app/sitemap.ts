import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/env";

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = [
    { path: "", priority: 1 },
    { path: "/memories", priority: 0.9 },
    { path: "/story", priority: 0.8 },
    { path: "/videos", priority: 0.8 },
    { path: "/timeline", priority: 0.7 },
    { path: "/letters", priority: 0.6 },
    { path: "/little-things", priority: 0.6 },
  ];
  return routes.map(({ path, priority }) => ({
    url: `${siteUrl}${path}`,
    changeFrequency: "weekly",
    priority,
  }));
}

import { ImageResponse } from "next/og";
import { imageUrl } from "@/lib/cloudinary/urls";
import { getSettings } from "@/lib/data/public";
import { isCloudinaryConfigured } from "@/lib/env";

export const alt = "Forever Jojo — 11 March 2017, forever";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Share preview: the homepage hero photograph with Jojo's name over it. */
export default async function OpengraphImage() {
  const { heroPhoto } = await getSettings();
  const photo =
    heroPhoto && isCloudinaryConfigured
      ? imageUrl(heroPhoto.publicId, {
          width: size.width,
          height: size.height,
          crop: "fill",
          format: "jpg",
          version: heroPhoto.version,
        })
      : null;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          background: "linear-gradient(135deg, #6b5a4e 0%, #51443C 55%, #2f2722 100%)",
          color: "#F8F5EF",
        }}
      >
        {photo ? (
          <img src={photo} alt="" width={size.width} height={size.height} style={{ position: "absolute", inset: 0 }} />
        ) : null}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(to top, rgba(47,39,34,0.85), rgba(47,39,34,0.1))",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 72,
            bottom: 64,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div style={{ fontSize: 112, letterSpacing: -2, lineHeight: 1 }}>Forever Jojo</div>
          <div style={{ fontSize: 30, marginTop: 20, letterSpacing: 6, opacity: 0.85 }}>
            11 MARCH 2017 — FOREVER
          </div>
        </div>
      </div>
    ),
    size,
  );
}

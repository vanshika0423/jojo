"use client";

import { useState, useTransition } from "react";
import { saveSettings } from "@/app/admin/actions/content";
import { PhotoField } from "@/components/admin/photo-picker";
import { report } from "@/components/admin/toast";
import { Card, Field, Toggle } from "@/components/admin/ui";
import type { FeatureSettings, HeroSettings, HomeSettings } from "@/lib/settings";
import type { Photo } from "@/lib/types";

export function SettingsForm({
  hero: initialHero,
  heroPhoto: initialPhoto,
  home: initialHome,
  features: initialFeatures,
}: {
  hero: HeroSettings;
  heroPhoto: Photo | null;
  home: HomeSettings;
  features: FeatureSettings;
}) {
  const [hero, setHero] = useState(initialHero);
  const [heroPhoto, setHeroPhoto] = useState<Photo | null>(initialPhoto);
  const [home, setHome] = useState(initialHome);
  const [features, setFeatures] = useState(initialFeatures);
  const [pending, startTransition] = useTransition();

  const saveHero = () =>
    startTransition(
      async () =>
        void report(
          await saveSettings({ key: "hero", value: { ...hero, photoId: heroPhoto?.id ?? null } }),
          "Homepage hero saved",
        ),
    );
  const saveHome = () =>
    startTransition(
      async () => void report(await saveSettings({ key: "home", value: home }), "Homepage text saved"),
    );
  const saveFeatures = (next: FeatureSettings) => {
    setFeatures(next);
    startTransition(
      async () => void report(await saveSettings({ key: "features", value: next }), "Settings saved"),
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <h2 className="text-cocoa mb-5 text-2xl">Homepage hero</h2>
        <div className="space-y-5">
          <PhotoField
            label="Hero photograph"
            photo={heroPhoto}
            onChange={setHeroPhoto}
            hint="A wide, landscape photo works best. It must be published to appear. Also used for link previews when shared."
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Title">
              {(id) => (
                <input
                  id={id}
                  className="field"
                  value={hero.title}
                  maxLength={80}
                  onChange={(e) => setHero({ ...hero, title: e.target.value })}
                />
              )}
            </Field>
            <Field label="Dates line">
              {(id) => (
                <input
                  id={id}
                  className="field"
                  value={hero.dates}
                  maxLength={80}
                  onChange={(e) => setHero({ ...hero, dates: e.target.value })}
                />
              )}
            </Field>
          </div>
          <Field label="Supporting line">
            {(id) => (
              <input
                id={id}
                className="field"
                value={hero.tagline}
                maxLength={200}
                onChange={(e) => setHero({ ...hero, tagline: e.target.value })}
              />
            )}
          </Field>
          <Field label="Button text">
            {(id) => (
              <input
                id={id}
                className="field"
                value={hero.cta}
                maxLength={40}
                onChange={(e) => setHero({ ...hero, cta: e.target.value })}
              />
            )}
          </Field>
          <div className="flex justify-end">
            <button
              type="button"
              className="btn btn-primary"
              onClick={saveHero}
              disabled={pending || !hero.title.trim()}
            >
              Save hero
            </button>
          </div>
        </div>
      </Card>

      <Card>
        <h2 className="text-cocoa mb-5 text-2xl">Homepage words</h2>
        <div className="space-y-5">
          <Field label="Introduction heading">
            {(id) => (
              <input
                id={id}
                className="field"
                value={home.introHeading}
                maxLength={120}
                onChange={(e) => setHome({ ...home, introHeading: e.target.value })}
              />
            )}
          </Field>
          <Field
            label="Introduction"
            hint="A short introduction to Jojo. Leave a blank line between paragraphs."
          >
            {(id) => (
              <textarea
                id={id}
                rows={7}
                className="field font-serif text-lg leading-relaxed"
                value={home.introBody}
                maxLength={4000}
                onChange={(e) => setHome({ ...home, introBody: e.target.value })}
              />
            )}
          </Field>
          <Field label="“The Little Things” introduction (optional)">
            {(id) => (
              <textarea
                id={id}
                rows={2}
                className="field"
                value={home.littleThingsIntro}
                maxLength={600}
                onChange={(e) => setHome({ ...home, littleThingsIntro: e.target.value })}
              />
            )}
          </Field>
          <Field label="Closing heading">
            {(id) => (
              <input
                id={id}
                className="field"
                value={home.finalHeading}
                maxLength={120}
                onChange={(e) => setHome({ ...home, finalHeading: e.target.value })}
              />
            )}
          </Field>
          <Field label="Closing line (optional)">
            {(id) => (
              <textarea
                id={id}
                rows={2}
                className="field"
                value={home.finalBody}
                maxLength={1000}
                onChange={(e) => setHome({ ...home, finalBody: e.target.value })}
              />
            )}
          </Field>
          <div className="flex justify-end">
            <button
              type="button"
              className="btn btn-primary"
              onClick={saveHome}
              disabled={pending || !home.finalHeading.trim()}
            >
              Save homepage words
            </button>
          </div>
        </div>
      </Card>

      <Card>
        <h2 className="text-cocoa mb-5 text-2xl">Visitors</h2>
        <div className="space-y-5">
          <Toggle
            label="Allow photo downloads"
            description="Shows a download button in the photo viewer for photos that allow it. (People can still screenshot any image they can see.)"
            checked={features.allowDownloads}
            onChange={(v) => saveFeatures({ ...features, allowDownloads: v })}
          />
          <Toggle
            label="Accept letters from the website"
            description="Letters always wait for your approval before appearing."
            checked={features.lettersOpen}
            onChange={(v) => saveFeatures({ ...features, lettersOpen: v })}
          />
        </div>
      </Card>
    </div>
  );
}

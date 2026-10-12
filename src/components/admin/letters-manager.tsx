"use client";

import { useState, useTransition } from "react";
import { deleteLetter, saveLetter, setLetterStatus } from "@/app/admin/actions/content";
import { PhotoField } from "@/components/admin/photo-picker";
import { report } from "@/components/admin/toast";
import { Card, ConfirmButton, Drawer, EmptyState, Field } from "@/components/admin/ui";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { Letter, LetterStatus, LetterVisibility, Photo } from "@/lib/types";

const tabs: Array<{ value: LetterStatus; label: string }> = [
  { value: "pending", label: "Waiting for review" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Not published" },
];

export function LettersManager({ letters }: { letters: Letter[] }) {
  const [tab, setTab] = useState<LetterStatus>("pending");
  const [editing, setEditing] = useState<Letter | "new" | null>(null);
  const [pending, startTransition] = useTransition();
  const shown = letters.filter((l) => l.status === tab);

  const setStatus = (id: string, status: LetterStatus, label: string) =>
    startTransition(async () => void report(await setLetterStatus({ id, status }), label));

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1">
          {tabs.map((t) => {
            const count = letters.filter((l) => l.status === t.value).length;
            return (
              <button
                key={t.value}
                type="button"
                aria-pressed={tab === t.value}
                onClick={() => setTab(t.value)}
                className={cn(
                  "rounded-full px-4 py-1.5 text-sm",
                  tab === t.value ? "bg-cocoa text-ivory" : "text-cocoa/80 bg-white",
                )}
              >
                {t.label} ({count})
              </button>
            );
          })}
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setEditing("new")}>
          ✎ Write a letter
        </button>
      </div>

      {shown.length === 0 ? (
        <EmptyState>Nothing here.</EmptyState>
      ) : (
        <ul className="space-y-4">
          {shown.map((letter) => (
            <Card key={letter.id}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-cocoa font-serif text-xl">From {letter.authorName}</p>
                <p className="text-taupe-dark text-xs">
                  {formatDate(letter.letterDate)} ·{" "}
                  {letter.visibility === "public" ? "Public" : "Private — family only"}
                  {letter.writtenByAdmin ? " · written in dashboard" : " · sent from the website"}
                </p>
              </div>
              <p className="text-cocoa/85 mt-3 line-clamp-6 font-serif text-lg leading-relaxed whitespace-pre-line">
                {letter.body}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {letter.status !== "approved" ? (
                  <button
                    type="button"
                    className="btn btn-primary !px-4 !py-2"
                    disabled={pending}
                    onClick={() =>
                      setStatus(
                        letter.id,
                        "approved",
                        letter.visibility === "public" ? "Approved and published" : "Approved (kept private)",
                      )
                    }
                  >
                    Approve
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn btn-ghost !px-4 !py-2"
                    disabled={pending}
                    onClick={() => setStatus(letter.id, "pending", "Moved back to review")}
                  >
                    Unpublish
                  </button>
                )}
                {letter.status !== "rejected" ? (
                  <button
                    type="button"
                    className="btn btn-ghost !px-4 !py-2"
                    disabled={pending}
                    onClick={() => setStatus(letter.id, "rejected", "Hidden")}
                  >
                    Don’t publish
                  </button>
                ) : null}
                <button
                  type="button"
                  className="btn btn-ghost !px-4 !py-2"
                  disabled={pending}
                  onClick={() =>
                    startTransition(
                      async () =>
                        void report(
                          await setLetterStatus({
                            id: letter.id,
                            visibility: letter.visibility === "public" ? "private" : "public",
                          }),
                          "Visibility updated",
                        ),
                    )
                  }
                >
                  Make {letter.visibility === "public" ? "private" : "public"}
                </button>
                <button
                  type="button"
                  className="btn btn-ghost !px-4 !py-2"
                  onClick={() => setEditing(letter)}
                >
                  Edit
                </button>
                <ConfirmButton
                  disabled={pending}
                  onConfirm={() =>
                    startTransition(async () => void report(await deleteLetter(letter.id), "Letter deleted"))
                  }
                >
                  Delete
                </ConfirmButton>
              </div>
            </Card>
          ))}
        </ul>
      )}

      <Drawer
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing === "new" ? "Write a letter" : "Edit letter"}
      >
        {editing ? (
          <LetterForm
            key={editing === "new" ? "new" : editing.id}
            letter={editing === "new" ? null : editing}
            onDone={() => setEditing(null)}
          />
        ) : null}
      </Drawer>
    </>
  );
}

function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function LetterForm({ letter, onDone }: { letter: Letter | null; onDone: () => void }) {
  const [authorName, setAuthorName] = useState(letter?.authorName ?? "");
  const [body, setBody] = useState(letter?.body ?? "");
  const [letterDate, setLetterDate] = useState(letter?.letterDate ?? today());
  const [visibility, setVisibility] = useState<LetterVisibility>(letter?.visibility ?? "public");
  const [status, setStatus] = useState<LetterStatus>(letter?.status ?? "approved");
  const [photo, setPhoto] = useState<Photo | null>(letter?.photo ?? null);
  const [pending, startTransition] = useTransition();

  const save = () =>
    startTransition(async () => {
      const res = await saveLetter({
        id: letter?.id,
        authorName,
        body,
        letterDate,
        visibility,
        status,
        photoId: photo?.id ?? null,
      });
      if (report(res, "Letter saved")) onDone();
    });

  return (
    <div className="space-y-5">
      <Field label="From">
        {(id) => (
          <input
            id={id}
            className="field"
            value={authorName}
            maxLength={100}
            onChange={(e) => setAuthorName(e.target.value)}
          />
        )}
      </Field>
      <Field label="Date">
        {(id) => (
          <input
            id={id}
            type="date"
            className="field"
            value={letterDate}
            onChange={(e) => setLetterDate(e.target.value)}
          />
        )}
      </Field>
      <Field label="Letter" hint="Leave a blank line between paragraphs.">
        {(id) => (
          <textarea
            id={id}
            rows={12}
            className="field paper font-serif text-lg leading-8"
            value={body}
            maxLength={10000}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Dear Jojo,"
          />
        )}
      </Field>
      <PhotoField label="Photo (optional)" photo={photo} onChange={setPhoto} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Who can read it">
          {(id) => (
            <select
              id={id}
              className="field"
              value={visibility}
              onChange={(e) => setVisibility(e.target.value as LetterVisibility)}
            >
              <option value="public">Everyone (public)</option>
              <option value="private">Only the family (private)</option>
            </select>
          )}
        </Field>
        <Field label="Status">
          {(id) => (
            <select
              id={id}
              className="field"
              value={status}
              onChange={(e) => setStatus(e.target.value as LetterStatus)}
            >
              <option value="approved">Approved</option>
              <option value="pending">Waiting for review</option>
              <option value="rejected">Not published</option>
            </select>
          )}
        </Field>
      </div>
      <p className="hint">Only approved, public letters appear on the website.</p>
      <div className="flex justify-end">
        <button
          type="button"
          className="btn btn-primary"
          onClick={save}
          disabled={pending || !authorName.trim() || !body.trim()}
        >
          {pending ? "Saving…" : "Save letter"}
        </button>
      </div>
    </div>
  );
}

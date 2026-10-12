"use client";

import { useActionState, useEffect, useRef } from "react";
import { submitLetter, type SubmitLetterState } from "@/app/(site)/letters/actions";
import { InfinityText } from "@/components/site/infinity-text";

const initialState: SubmitLetterState = { status: "idle" };

export function LetterForm() {
  const [state, action, pending] = useActionState(submitLetter, initialState);
  const startedAt = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (startedAt.current) startedAt.current.value = String(Date.now());
  }, []);

  if (state.status === "success") {
    return (
      <div role="status" className="paper rounded-3xl px-8 py-12 text-center shadow-sm">
        <p className="font-serif text-3xl text-cocoa">Thank you <InfinityText text="♾️" /></p>
        <p className="mt-3 text-cocoa/75">{state.message}</p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-5 rounded-3xl bg-white/70 p-6 shadow-sm sm:p-10">
      <div>
        <label htmlFor="authorName" className="label">
          Your name
        </label>
        <input id="authorName" name="authorName" required maxLength={100} className="field" autoComplete="name" />
      </div>
      <div>
        <label htmlFor="body" className="label">
          Your letter
        </label>
        <textarea
          id="body"
          name="body"
          required
          minLength={10}
          maxLength={10000}
          rows={9}
          className="field paper font-serif text-lg leading-8"
          placeholder="Dear Jojo,"
        />
      </div>
      <fieldset>
        <legend className="label">Who can read it?</legend>
        <div className="flex flex-col gap-2 text-sm text-cocoa/85 sm:flex-row sm:gap-6">
          <label className="flex items-center gap-2">
            <input type="radio" name="visibility" value="public" defaultChecked className="accent-cocoa" />
            Share it here, after the family approves it
          </label>
          <label className="flex items-center gap-2">
            <input type="radio" name="visibility" value="private" className="accent-cocoa" />
            Only the family
          </label>
        </div>
      </fieldset>

      {/* Spam trap: hidden from people and assistive tech. */}
      <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          Website
          <input name="website" tabIndex={-1} autoComplete="off" defaultValue="" />
        </label>
      </div>
      <input ref={startedAt} type="hidden" name="startedAt" defaultValue="0" />

      {state.status === "error" ? (
        <p role="alert" className="text-sm text-[#9b3d32]">
          {state.message}
        </p>
      ) : null}
      <button type="submit" className="btn btn-primary" disabled={pending}>
        {pending ? "Sending…" : "Send your letter"}
      </button>
      <p className="hint">Every letter is read by the family before it appears on the site.</p>
    </form>
  );
}

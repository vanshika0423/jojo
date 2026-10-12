"use client";

import { useEffect, useId, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "@/lib/cn";

export function AdminLoading() {
  return (
    <div
      className="flex min-h-[40vh] items-center justify-center text-sm uppercase tracking-[0.2em] text-taupe-dark"
      role="status"
    >
      Loading…
    </div>
  );
}

export function PageTitle({
  title,
  children,
  actions,
}: {
  title: string;
  children?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-4xl text-cocoa">{title}</h1>
        {children ? <div className="mt-2 max-w-2xl text-sm leading-relaxed text-cocoa/70">{children}</div> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </header>
  );
}

export function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return <section className={cn("rounded-2xl bg-white p-5 shadow-[0_1px_2px_rgba(81,68,60,0.08)] sm:p-6", className)}>{children}</section>;
}

export function Toggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  description?: string;
}) {
  const id = useId();
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <label htmlFor={id} className="text-sm font-medium text-cocoa">
          {label}
        </label>
        {description ? <p className="hint !mt-0.5">{description}</p> : null}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative h-7 w-12 shrink-0 rounded-full transition-colors",
          checked ? "bg-sage-dark" : "bg-taupe/50",
        )}
      >
        <span
          className={cn(
            "absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-transform",
            checked ? "translate-x-6" : "translate-x-1",
          )}
        />
      </button>
    </div>
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: (id: string) => React.ReactNode;
}) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="label">
        {label}
      </label>
      {children(id)}
      {hint ? <p className="hint">{hint}</p> : null}
    </div>
  );
}

export function StatusPill({ published }: { published: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        published ? "bg-sage/30 text-[#4d5a47]" : "bg-cream text-taupe-dark",
      )}
    >
      {published ? "Published" : "Draft"}
    </span>
  );
}

/** A button that asks “are you sure?” inline before running a destructive action. */
export function ConfirmButton({
  onConfirm,
  children,
  confirmLabel = "Yes, delete",
  className,
  disabled,
}: {
  onConfirm: () => void;
  children: React.ReactNode;
  confirmLabel?: string;
  className?: string;
  disabled?: boolean;
}) {
  const [asking, setAsking] = useState(false);
  if (asking) {
    return (
      <span className="inline-flex items-center gap-2">
        <button
          type="button"
          className="btn btn-danger !px-4 !py-2"
          onClick={() => {
            setAsking(false);
            onConfirm();
          }}
        >
          {confirmLabel}
        </button>
        <button type="button" className="btn btn-ghost !px-4 !py-2" onClick={() => setAsking(false)}>
          Cancel
        </button>
      </span>
    );
  }
  return (
    <button type="button" className={cn("btn btn-ghost !px-4 !py-2", className)} disabled={disabled} onClick={() => setAsking(true)}>
      {children}
    </button>
  );
}

/** Side panel on desktop, full-height sheet on phones. */
export function Drawer({
  open,
  onClose,
  title,
  children,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      previous?.focus();
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-[90]">
          <motion.div
            className="absolute inset-0 bg-cocoa-deep/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className={cn(
              "absolute inset-y-0 right-0 flex w-full flex-col bg-ivory shadow-2xl",
              wide ? "sm:max-w-4xl" : "sm:max-w-xl",
            )}
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 380, damping: 40 }}
          >
            <div className="flex items-center justify-between border-b border-taupe/25 px-5 py-4">
              <h2 className="text-2xl text-cocoa">{title}</h2>
              <button
                ref={closeRef}
                type="button"
                onClick={onClose}
                className="flex h-10 w-10 items-center justify-center rounded-full text-2xl hover:bg-cream"
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-6">{children}</div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}

export function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-taupe/60 px-6 py-12 text-center text-sm text-taupe-dark">
      {children}
    </div>
  );
}

export function SetupNotice({ service }: { service: "Supabase" | "Cloudinary" }) {
  return (
    <div className="mb-6 rounded-2xl border border-[#e3c9a8] bg-[#fbf3e6] px-5 py-4 text-sm text-cocoa">
      <strong>{service} isn’t connected yet.</strong> Add its keys to your environment variables (see{" "}
      <code>.env.example</code> and the README’s setup guide), then redeploy.
    </div>
  );
}

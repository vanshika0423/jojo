"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";

type Toast = { id: number; message: string; tone: "success" | "error" };

const EVENT = "jojo-toast";

/** Show a short message at the bottom of the dashboard. */
export function notify(message: string, tone: Toast["tone"] = "success") {
  window.dispatchEvent(new CustomEvent(EVENT, { detail: { message, tone } }));
}

/** Convenience: report an action result and return whether it succeeded. */
export function report(result: { ok: boolean; error?: string }, success: string) {
  if (result.ok) notify(success);
  else notify(result.error ?? "Something went wrong.", "error");
  return result.ok;
}

export function Toaster() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  useEffect(() => {
    let id = 0;
    const onToast = (e: Event) => {
      const { message, tone } = (e as CustomEvent<Omit<Toast, "id">>).detail;
      const toast = { id: ++id, message, tone };
      setToasts((t) => [...t.slice(-3), toast]);
      setTimeout(() => setToasts((t) => t.filter((x) => x.id !== toast.id)), tone === "error" ? 7000 : 3500);
    };
    window.addEventListener(EVENT, onToast);
    return () => window.removeEventListener(EVENT, onToast);
  }, []);
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-4 z-[100] flex flex-col items-center gap-2 px-4"
    >
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            role={t.tone === "error" ? "alert" : "status"}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className={
              "pointer-events-auto max-w-md rounded-full px-5 py-3 text-sm shadow-lg " +
              (t.tone === "error" ? "bg-[#7e3128] text-white" : "bg-cocoa text-ivory")
            }
          >
            {t.tone === "success" ? "✓ " : "⚠ "}
            {t.message}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

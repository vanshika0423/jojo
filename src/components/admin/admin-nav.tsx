"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

export const adminLinks = [
  { href: "/admin", label: "Overview", icon: "◎" },
  { href: "/admin/photos", label: "Photos", icon: "▦" },
  { href: "/admin/albums", label: "Albums", icon: "❏" },
  { href: "/admin/videos", label: "Videos", icon: "▶" },
  { href: "/admin/story", label: "His Story", icon: "✎" },
  { href: "/admin/timeline", label: "Timeline", icon: "⟡" },
  { href: "/admin/letters", label: "Letters", icon: "✉" },
  { href: "/admin/little-things", label: "Little Things", icon: "✦" },
  { href: "/admin/settings", label: "Homepage & Settings", icon: "⚙" },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Dashboard">
      <ul className="no-scrollbar flex gap-1 overflow-x-auto lg:flex-col">
        {adminLinks.map((link) => {
          const active = link.href === "/admin" ? pathname === "/admin" : pathname.startsWith(link.href);
          return (
            <li key={link.href} className="shrink-0">
              <Link
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-full px-4 py-2 text-sm transition-colors lg:rounded-xl",
                  active ? "bg-cocoa text-ivory" : "text-cocoa/75 hover:bg-cream",
                )}
              >
                <span aria-hidden className="w-4 text-center">
                  {link.icon}
                </span>
                {link.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

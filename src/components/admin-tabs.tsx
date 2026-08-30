"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { useT } from "@/lib/i18n/client";
import type { TranslationKey } from "@/lib/i18n/dictionaries";

const tabs: { href: string; label: TranslationKey }[] = [
  { href: "/admin", label: "nav.dashboard" },
  { href: "/admin/events", label: "nav.adminEvents" },
  { href: "/admin/items", label: "nav.adminItems" },
  { href: "/admin/members", label: "nav.adminMembers" },
  { href: "/admin/rules", label: "nav.adminRules" },
];

export function AdminTabs() {
  const t = useT();
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap gap-1">
      {tabs.map((tab) => {
        const active =
          tab.href === "/admin"
            ? pathname === "/admin"
            : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`rounded-lg px-3 py-1.5 text-sm transition ${
              active
                ? "bg-moon-600/20 text-moon-400"
                : "text-white/55 hover:bg-white/5 hover:text-white"
            }`}
          >
            {t(tab.label)}
          </Link>
        );
      })}
    </nav>
  );
}

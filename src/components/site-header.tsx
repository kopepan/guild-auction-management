"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import {
  CalendarDays,
  LayoutDashboard,
  ListOrdered,
  LogOut,
  Menu,
  Moon,
  ScrollText,
  Shield,
  X,
} from "lucide-react";

import { LocaleToggle } from "@/components/locale-toggle";
import { signOutAction } from "@/lib/actions/auth";
import { useT } from "@/lib/i18n/client";
import type { TranslationKey } from "@/lib/i18n/dictionaries";

type NavUser = {
  name: string | null;
  characterName: string | null;
  role: "member" | "admin";
  viewAsMember?: boolean;
} | null;

const memberLinks: { href: string; label: TranslationKey; icon: typeof Moon }[] =
  [
    { href: "/", label: "nav.dashboard", icon: LayoutDashboard },
    { href: "/wishlist", label: "nav.wishlist", icon: ListOrdered },
    { href: "/events", label: "nav.events", icon: CalendarDays },
    { href: "/rules", label: "nav.rules", icon: ScrollText },
  ];

export function SiteHeader({
  user,
  registrationOnly = false,
  adminControls = null,
}: {
  user: NavUser;
  registrationOnly?: boolean;
  adminControls?: ReactNode;
}) {
  const t = useT();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isAdminMode = user?.role === "admin" && !user.viewAsMember;

  const links: { href: string; label: TranslationKey; icon: typeof Moon }[] =
    registrationOnly
      ? []
      : isAdminMode
        ? [{ href: "/admin", label: "nav.admin", icon: Shield }]
        : [...memberLinks];

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  if (registrationOnly) {
    return (
      <header className="sticky top-0 z-40 border-b border-white/10 bg-night-950/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
          <span className="flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-moon-500 to-moon-700 shadow-lg shadow-moon-700/30">
              <Moon className="size-5 text-white" aria-hidden />
            </span>
            <span className="leading-tight">
              <span className="block text-sm font-semibold text-white">
                {t("app.name")}
              </span>
              <span className="block text-[11px] text-white/45">
                {t("registerGearRating.headerHint")}
              </span>
            </span>
          </span>
          {user ? (
            <div className="ml-auto flex items-center gap-2">
              {adminControls}
              <form action={signOutAction}>
                <button
                  type="submit"
                  title={t("nav.signOut")}
                  className="btn-ghost btn-sm"
                >
                  <LogOut className="size-4" aria-hidden />
                </button>
              </form>
            </div>
          ) : null}
        </div>
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-night-950/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
        <Link href={isAdminMode ? "/admin" : "/"} className="flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-moon-500 to-moon-700 shadow-lg shadow-moon-700/30">
            <Moon className="size-5 text-white" aria-hidden />
          </span>
          <span className="leading-tight">
            <span className="block text-sm font-semibold text-white">
              {t("app.name")}
            </span>
            <span className="block text-[11px] text-white/45">
              {t("app.tagline")}
            </span>
          </span>
        </Link>

        <nav className="ml-6 hidden items-center gap-1 md:flex">
          {links.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm transition ${
                isActive(href)
                  ? "bg-white/10 text-white"
                  : "text-white/60 hover:bg-white/5 hover:text-white"
              }`}
            >
              <Icon className="size-4" aria-hidden />
              {t(label)}
            </Link>
          ))}
        </nav>

        <div className="ml-auto hidden items-center gap-2 md:flex">
          <LocaleToggle />
          {adminControls}
          {user ? (
            <>
              {!isAdminMode ? (
                <Link
                  href="/profile"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/[0.04] px-3 py-2 text-sm text-white/85 hover:bg-white/10"
                >
                  <span className="max-w-32 truncate">
                    {user.name || user.characterName || t("common.member")}
                  </span>
                </Link>
              ) : (
                <span className="max-w-32 truncate rounded-lg border border-white/15 bg-white/[0.04] px-3 py-2 text-sm text-white/85">
                  {user.name || user.characterName || t("common.member")}
                </span>
              )}
              <form action={signOutAction}>
                <button
                  type="submit"
                  title={t("nav.signOut")}
                  className="btn-ghost btn-sm"
                >
                  <LogOut className="size-4" aria-hidden />
                </button>
              </form>
            </>
          ) : (
            <Link href="/login" className="btn-primary btn-sm">
              {t("nav.signIn")}
            </Link>
          )}
        </div>

        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-label="Menu"
          className="btn-ghost btn-sm ml-auto md:hidden"
        >
          {open ? <X className="size-4" /> : <Menu className="size-4" />}
        </button>
      </div>

      {open ? (
        <div className="border-t border-white/10 px-4 py-3 md:hidden">
          <nav className="flex flex-col gap-1">
            {links.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${
                  isActive(href)
                    ? "bg-white/10 text-white"
                    : "text-white/65 hover:bg-white/5"
                }`}
              >
                <Icon className="size-4" aria-hidden />
                {t(label)}
              </Link>
            ))}
          </nav>
          <div className="mt-3 flex items-center justify-between gap-2 border-t border-white/10 pt-3">
            <LocaleToggle />
            {adminControls}
            {user ? (
              <form action={signOutAction}>
                <button type="submit" className="btn-ghost btn-sm">
                  <LogOut className="size-4" aria-hidden />
                </button>
              </form>
            ) : (
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className="btn-primary btn-sm"
              >
                {t("nav.signIn")}
              </Link>
            )}
          </div>
        </div>
      ) : null}
    </header>
  );
}

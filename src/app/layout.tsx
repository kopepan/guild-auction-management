import type { Metadata } from "next";
import { Geist, Geist_Mono, Noto_Sans_Thai } from "next/font/google";

import { SiteHeader } from "@/components/site-header";
import { ViewAsMemberToggle } from "@/components/view-as-member-toggle";
import { getSessionUser } from "@/lib/guards";
import { LocaleProvider } from "@/lib/i18n/client";
import { getLocale } from "@/lib/i18n/server";
import { getRegistrationRound } from "@/lib/queries";
import { shouldUseRegistrationChrome } from "@/lib/phase";
import { isViewAsMember } from "@/lib/view-as-member";

import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});
const notoThai = Noto_Sans_Thai({
  variable: "--font-noto-thai",
  subsets: ["thai", "latin"],
});

export const metadata: Metadata = {
  title: "MoonShade — Guild Auction Queue Manager",
  description:
    "Queue management for MoonShade guild event rewards in Ragnarok: The New World.",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [locale, user, registrationRound, viewAsMember] = await Promise.all([
    getLocale(),
    getSessionUser(),
    getRegistrationRound(),
    isViewAsMember(),
  ]);
  const registrationChrome = shouldUseRegistrationChrome({
    registrationRound,
    user,
    viewAsMember,
  });
  const adminControls =
    user?.isSystemAdmin ? (
      <ViewAsMemberToggle viewAsMember={viewAsMember} />
    ) : null;

  return (
    <html lang={locale}>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${notoThai.variable} font-sans antialiased`}
      >
        <LocaleProvider locale={locale}>
          <SiteHeader
            registrationOnly={registrationChrome}
            adminControls={adminControls}
            user={
              user
                ? {
                    name: user.name,
                    characterName: user.characterName,
                    isSystemAdmin: user.isSystemAdmin,
                    viewAsMember,
                  }
                : null
            }
          />
          <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
          {registrationChrome ? null : (
            <footer className="mx-auto max-w-6xl px-4 pt-4 pb-10 text-center text-xs text-white/30">
              MoonShade · Ragnarok: The New World
            </footer>
          )}
        </LocaleProvider>
      </body>
    </html>
  );
}

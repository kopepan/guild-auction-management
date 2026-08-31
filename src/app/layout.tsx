import type { Metadata } from "next";
import { Geist, Geist_Mono, Noto_Sans_Thai } from "next/font/google";

import { AppShellBoundary } from "@/components/app-shell-boundary";

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

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="th">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${notoThai.variable} font-sans antialiased`}
      >
        <AppShellBoundary>{children}</AppShellBoundary>
      </body>
    </html>
  );
}

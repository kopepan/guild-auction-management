"use client";

import type { ReactNode } from "react";

import { noSsr } from "@/lib/no-ssr";

const AppShell = noSsr<{ children: ReactNode }>(() =>
  import("@/components/app-shell").then((mod) => ({ default: mod.AppShell })),
);

export function AppShellBoundary({ children }: { children: ReactNode }) {
  return <AppShell>{children}</AppShell>;
}

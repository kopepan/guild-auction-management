"use client";

import dynamic from "next/dynamic";
import type { ComponentType } from "react";

import { PageLoader } from "@/components/spinner";

export function noSsr<P extends object>(
  loader: () => Promise<{ default: ComponentType<P> }>,
) {
  return dynamic(loader, {
    ssr: false,
    loading: () => <PageLoader />,
  });
}

'use client';

import { noSsr } from "@/lib/no-ssr";

const Page = noSsr(() => import("./page-client"));

export default function RegisterGearRatingPage() {
  return <Page />;
}

"use client";

import { PageLoader } from "@/components/spinner";
import { usePageData } from "@/lib/use-page-data";

export default function AuctionRegisterClient() {
  usePageData<never>("/auction-register");

  return <PageLoader />;
}

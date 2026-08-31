"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { ItemForm } from "@/components/item-form";
import { Card, PageHeader } from "@/components/ui";
import { PageLoader } from "@/components/spinner";
import { useT } from "@/lib/i18n/client";
import { usePageData } from "@/lib/use-page-data";

export default function NewItemClient() {
  const state = usePageData<Record<string, never>>("/admin/items/new");
  const t = useT();

  if (state.status === "loading" || state.status === "redirect") {
    return <PageLoader />;
  }
  if (state.status === "notFound") {
    return null;
  }

  return (
    <>
      <Link
        href="/admin/items"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-white/50 hover:text-white"
      >
        <ArrowLeft className="size-4" aria-hidden />
        {t("adminItems.title")}
      </Link>
      <PageHeader title={t("adminItems.new")} />
      <div className="max-w-3xl">
        <Card>
          <ItemForm />
        </Card>
      </div>
    </>
  );
}

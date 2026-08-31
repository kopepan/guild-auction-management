"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { EventForm } from "@/components/event-form";
import { Card, PageHeader } from "@/components/ui";
import { PageLoader } from "@/components/spinner";
import { useT } from "@/lib/i18n/client";
import { usePageData } from "@/lib/use-page-data";

export default function NewEventClient() {
  const state = usePageData<Record<string, never>>("/admin/events/new");
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
        href="/admin/events"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-white/50 hover:text-white"
      >
        <ArrowLeft className="size-4" aria-hidden />
        {t("adminEvents.title")}
      </Link>
      <PageHeader title={t("adminEvents.new")} />
      <div className="max-w-3xl">
        <Card>
          <EventForm />
        </Card>
      </div>
    </>
  );
}

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { EventForm } from "@/components/event-form";
import { Card, PageHeader } from "@/components/ui";
import { getTranslations } from "@/lib/i18n/server";

export default async function NewEventPage() {
  const { t } = await getTranslations();

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

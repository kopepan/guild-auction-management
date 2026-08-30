import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { ItemForm } from "@/components/item-form";
import { Card, PageHeader } from "@/components/ui";
import { getTranslations } from "@/lib/i18n/server";

export default async function NewItemPage() {
  const { t } = await getTranslations();

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

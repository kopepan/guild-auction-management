import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { DeleteItemButton } from "@/components/delete-item-button";
import { ItemForm } from "@/components/item-form";
import { Card, PageHeader, SectionTitle } from "@/components/ui";
import { getItem } from "@/lib/queries";
import { getTranslations } from "@/lib/i18n/server";

export default async function EditItemPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const item = await getItem(id);
  if (!item) notFound();

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
      <PageHeader title={item.nameEn} />

      <div className="max-w-3xl space-y-4">
        <Card>
          <ItemForm
            item={{
              id: item.id,
              nameEn: item.nameEn,
              nameTh: item.nameTh,
              category: item.category,
              queueTypes: item.queueTypes,
              imageUrl: item.imageUrl,
              descriptionEn: item.descriptionEn,
              descriptionTh: item.descriptionTh,
              isActive: item.isActive,
            }}
          />
        </Card>

        <Card>
          <SectionTitle hint={t("adminItems.deleteBlocked")}>
            {t("common.delete")}
          </SectionTitle>
          <DeleteItemButton itemId={item.id} />
        </Card>
      </div>
    </>
  );
}

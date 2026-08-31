"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { DeleteItemButton } from "@/components/delete-item-button";
import { ItemForm, type ItemFormValues } from "@/components/item-form";
import { Card, PageHeader, SectionTitle } from "@/components/ui";
import { PageLoader } from "@/components/spinner";
import { useT } from "@/lib/i18n/client";
import { usePageData } from "@/lib/use-page-data";

type AdminItemDetailData = {
  item: ItemFormValues & { id: string };
};

export default function EditItemClient() {
  const pathname = usePathname();
  const state = usePageData<AdminItemDetailData>(pathname);
  const t = useT();

  if (state.status === "loading" || state.status === "redirect") {
    return <PageLoader />;
  }
  if (state.status === "notFound") {
    return null;
  }

  const { item } = state.data;

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
          <ItemForm item={item} />
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

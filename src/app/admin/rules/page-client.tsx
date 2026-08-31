"use client";

import { RulesForm } from "@/components/rules-form";
import { Card, PageHeader } from "@/components/ui";
import { PageLoader } from "@/components/spinner";
import { useT } from "@/lib/i18n/client";
import { usePageData } from "@/lib/use-page-data";

type AdminRulesData = {
  valueEn: string | null;
  valueTh: string | null;
};

export default function AdminRulesClient() {
  const state = usePageData<AdminRulesData>("/admin/rules");
  const t = useT();

  if (state.status === "loading" || state.status === "redirect") {
    return <PageLoader />;
  }
  if (state.status === "notFound") {
    return null;
  }

  const { valueEn, valueTh } = state.data;

  return (
    <>
      <PageHeader title={t("rules.editTitle")} subtitle={t("rules.editHint")} />
      <Card>
        <RulesForm valueEn={valueEn} valueTh={valueTh} />
      </Card>
    </>
  );
}

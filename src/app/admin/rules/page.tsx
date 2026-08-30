import { RulesForm } from "@/components/rules-form";
import { Card, PageHeader } from "@/components/ui";
import { SETTING_KEYS } from "@/db/schema";
import { getSetting } from "@/lib/queries";
import { getTranslations } from "@/lib/i18n/server";

export default async function AdminRulesPage() {
  const { t } = await getTranslations();
  const setting = await getSetting(SETTING_KEYS.rules);

  return (
    <>
      <PageHeader title={t("rules.editTitle")} subtitle={t("rules.editHint")} />
      <Card>
        <RulesForm
          valueEn={setting?.valueEn ?? null}
          valueTh={setting?.valueTh ?? null}
        />
      </Card>
    </>
  );
}

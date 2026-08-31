import { PageLoader } from "@/components/spinner";
import { getTranslations } from "@/lib/i18n/server";

export default async function AdminLoading() {
  const { t } = await getTranslations();
  return <PageLoader label={t("common.loading")} />;
}

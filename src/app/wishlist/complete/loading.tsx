import { PageLoader } from "@/components/spinner";
import { getTranslations } from "@/lib/i18n/server";

export default async function WishlistCompleteLoading() {
  const { t } = await getTranslations();
  return <PageLoader label={t("common.loading")} />;
}

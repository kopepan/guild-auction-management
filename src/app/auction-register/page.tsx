import { redirect } from "next/navigation";

import { getSessionUser } from "@/lib/guards";
import { getRegistrationEntryPath } from "@/lib/phase";
import { getRegistrationRound } from "@/lib/queries";
import { isViewAsMember } from "@/lib/view-as-member";

/** Public entry point linked from Discord during registration. */
export default async function AuctionRegisterPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const round = await getRegistrationRound();
  if (!round) redirect("/");

  const viewAsMember = user.isSystemAdmin && (await isViewAsMember());
  if (user.isSystemAdmin && !viewAsMember) redirect("/wishlist");

  redirect(await getRegistrationEntryPath(user));
}

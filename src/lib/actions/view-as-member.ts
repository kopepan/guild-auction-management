"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { assertAdmin } from "@/lib/guards";
import { getRegistrationEntryPath } from "@/lib/phase";
import { VIEW_AS_MEMBER_COOKIE } from "@/lib/view-as-member";

export async function enableViewAsMemberAction() {
  const user = await assertAdmin();

  const store = await cookies();
  store.set(VIEW_AS_MEMBER_COOKIE, "1", {
    path: "/",
    sameSite: "lax",
  });

  revalidatePath("/", "layout");
  redirect(await getRegistrationEntryPath(user.id));
}

export async function disableViewAsMemberAction() {
  await assertAdmin();

  const store = await cookies();
  store.delete(VIEW_AS_MEMBER_COOKIE);

  revalidatePath("/", "layout");
  redirect("/admin");
}

"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

import { isLocale } from "@/lib/i18n/dictionaries";
import { LOCALE_COOKIE } from "@/lib/i18n/server";

const ONE_YEAR = 60 * 60 * 24 * 365;

export async function setLocaleAction(value: string) {
  if (!isLocale(value)) return;

  const store = await cookies();
  store.set(LOCALE_COOKIE, value, {
    path: "/",
    maxAge: ONE_YEAR,
    sameSite: "lax",
  });
  revalidatePath("/", "layout");
}

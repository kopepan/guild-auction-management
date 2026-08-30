"use server";

import { signIn, signOut } from "@/auth";
import { getRegistrationRound } from "@/lib/queries";

async function postLoginPath() {
  const round = await getRegistrationRound();
  // Gear Rating page forwards admins and members who already submitted.
  return round ? "/auction-register" : "/";
}

export async function signInWithDiscordAction() {
  await signIn("discord", { redirectTo: await postLoginPath() });
}

export async function signInWithDevAction(formData: FormData) {
  await signIn("dev", {
    name: String(formData.get("name") ?? ""),
    redirectTo: await postLoginPath(),
  });
}

export async function signOutAction() {
  await signOut({ redirectTo: "/" });
}

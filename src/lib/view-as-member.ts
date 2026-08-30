import { cookies } from "next/headers";

export const VIEW_AS_MEMBER_COOKIE = "moonshade_view_as_member";

export async function isViewAsMember(): Promise<boolean> {
  const store = await cookies();
  return store.get(VIEW_AS_MEMBER_COOKIE)?.value === "1";
}

export function actsAsMember(input: {
  isSystemAdmin: boolean;
  viewAsMember: boolean;
}): boolean {
  return !input.isSystemAdmin || input.viewAsMember;
}

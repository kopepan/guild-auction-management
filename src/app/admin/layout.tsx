import type { ReactNode } from "react";

import { AdminTabs } from "@/components/admin-tabs";
import { ViewAsMemberToggle } from "@/components/view-as-member-toggle";
import { requireAdmin } from "@/lib/guards";
import { isViewAsMember } from "@/lib/view-as-member";

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireAdmin();
  const viewAsMember = await isViewAsMember();

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3 border-b border-white/10 pb-3">
        <AdminTabs />
        <ViewAsMemberToggle viewAsMember={viewAsMember} prominent />
      </div>
      {children}
    </div>
  );
}

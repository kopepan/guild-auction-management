"use client";

import type { ReactNode } from "react";

import { AdminGuard } from "@/components/app-shell";
import { AdminTabs } from "@/components/admin-tabs";
import { ViewAsMemberToggle } from "@/components/view-as-member-toggle";
import { useAppBootstrap } from "@/lib/app-bootstrap-context";

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { bootstrap } = useAppBootstrap();

  return (
    <AdminGuard>
      <div>
        <div className="mb-6 flex flex-wrap items-start justify-between gap-3 border-b border-white/10 pb-3">
          <AdminTabs />
          <ViewAsMemberToggle
            viewAsMember={bootstrap?.viewAsMember ?? false}
            prominent
          />
        </div>
        {children}
      </div>
    </AdminGuard>
  );
}

"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import { SiteHeader } from "@/components/site-header";
import { ViewAsMemberToggle } from "@/components/view-as-member-toggle";
import { PageLoader } from "@/components/spinner";
import {
  AppBootstrapProvider,
  useAppBootstrap,
} from "@/lib/app-bootstrap-context";
import { LocaleProvider } from "@/lib/i18n/client";

function AppShellInner({ children }: { children: ReactNode }) {
  const { bootstrap, loading } = useAppBootstrap();

  if (loading || !bootstrap) {
    return <PageLoader />;
  }

  const adminControls =
    bootstrap.user?.isSystemAdmin ? (
      <ViewAsMemberToggle
        viewAsMember={bootstrap.viewAsMember}
        prominent={bootstrap.registrationOnly}
      />
    ) : null;

  return (
    <LocaleProvider locale={bootstrap.locale}>
      <SiteHeader
        registrationOnly={bootstrap.registrationOnly}
        adminControls={adminControls}
        user={bootstrap.user}
      />
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
      {bootstrap.registrationOnly ? null : (
        <footer className="mx-auto max-w-6xl px-4 pt-4 pb-10 text-center text-xs text-white/30">
          MoonShade · Ragnarok: The New World
        </footer>
      )}
    </LocaleProvider>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <AppBootstrapProvider>
      <AppShellInner>{children}</AppShellInner>
    </AppBootstrapProvider>
  );
}

export function AdminGuard({ children }: { children: ReactNode }) {
  const { bootstrap, loading } = useAppBootstrap();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!bootstrap?.user?.isSystemAdmin) {
      router.replace("/");
    }
  }, [bootstrap, loading, router]);

  if (loading || !bootstrap?.user?.isSystemAdmin) {
    return <PageLoader />;
  }

  return <>{children}</>;
}

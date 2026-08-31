"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import type { BootstrapData } from "@/lib/page-loaders/bootstrap";

type AppBootstrapContextValue = {
  bootstrap: BootstrapData | null;
  loading: boolean;
  refresh: () => Promise<void>;
};

const AppBootstrapContext = createContext<AppBootstrapContextValue>({
  bootstrap: null,
  loading: true,
  refresh: async () => {},
});

export function AppBootstrapProvider({ children }: { children: ReactNode }) {
  const [bootstrap, setBootstrap] = useState<BootstrapData | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const response = await fetch("/api/bootstrap", { credentials: "same-origin" });
    if (!response.ok) return;
    const data = (await response.json()) as BootstrapData;
    setBootstrap(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <AppBootstrapContext.Provider value={{ bootstrap, loading, refresh }}>
      {children}
    </AppBootstrapContext.Provider>
  );
}

export function useAppBootstrap() {
  return useContext(AppBootstrapContext);
}

"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type PageState<T> =
  | { status: "loading" }
  | { status: "redirect"; href: string }
  | { status: "notFound" }
  | { status: "ready"; data: T };

export function usePageData<T>(path: string) {
  const router = useRouter();
  const [state, setState] = useState<PageState<T>>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading" });

    fetch(`/api/data/page?path=${encodeURIComponent(path)}`, {
      credentials: "same-origin",
    })
      .then(async (response) => {
        const json = (await response.json()) as {
          redirect?: string;
          notFound?: boolean;
          data?: T;
        };
        if (cancelled) return;

        if (json.redirect) {
          setState({ status: "redirect", href: json.redirect });
          router.replace(json.redirect);
          return;
        }
        if (json.notFound || !response.ok) {
          setState({ status: "notFound" });
          return;
        }
        setState({ status: "ready", data: json.data as T });
      })
      .catch(() => {
        if (!cancelled) setState({ status: "notFound" });
      });

    return () => {
      cancelled = true;
    };
  }, [path, router]);

  return state;
}

"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

type PageState<T> =
  | { status: "loading" }
  | { status: "redirect"; href: string }
  | { status: "notFound" }
  | { status: "ready"; data: T };

export type UsePageDataResult<T> = PageState<T> & {
  reload: () => void;
};

export function usePageData<T>(path: string): UsePageDataResult<T> {
  const router = useRouter();
  const [state, setState] = useState<PageState<T>>({ status: "loading" });
  const [version, setVersion] = useState(0);
  const pathRef = useRef(path);

  const reload = useCallback(() => {
    setVersion((current) => current + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const pathChanged = pathRef.current !== path;
    pathRef.current = path;

    setState((prev) =>
      pathChanged || prev.status !== "ready"
        ? { status: "loading" }
        : prev,
    );

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
  }, [path, router, version]);

  return { ...state, reload };
}

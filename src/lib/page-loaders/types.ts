export type PageLoaderRedirect = { redirect: string };
export type PageLoaderNotFound = { notFound: true };
export type PageLoaderData<T> = { data: T };

export type PageLoaderResult<T> =
  | PageLoaderRedirect
  | PageLoaderNotFound
  | PageLoaderData<T>;

export function redirectTo(href: string): PageLoaderRedirect {
  return { redirect: href };
}

export function notFound(): PageLoaderNotFound {
  return { notFound: true };
}

export function pageData<T>(data: T): PageLoaderData<T> {
  return { data };
}

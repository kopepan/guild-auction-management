import {
  loadAdminDashboard,
  loadAdminEventDetail,
  loadAdminEvents,
  loadAdminEventsNew,
  loadAdminItemDetail,
  loadAdminItems,
  loadAdminItemsNew,
  loadAdminMembers,
  loadAdminRules,
} from "@/lib/page-loaders/admin";
import {
  loadAuctionRegister,
  loadDashboard,
  loadEventDetail,
  loadEvents,
  loadLogin,
  loadProfile,
  loadRegisterGearRating,
  loadRules,
  loadWishlist,
  loadWishlistComplete,
} from "@/lib/page-loaders/member";
import { notFound, type PageLoaderResult } from "@/lib/page-loaders/types";

type LoaderFn = (id?: string) => Promise<PageLoaderResult<unknown>>;

const staticRoutes: Record<string, LoaderFn> = {
  "/": () => loadDashboard(),
  "/login": () => loadLogin(),
  "/profile": () => loadProfile(),
  "/events": () => loadEvents(),
  "/rules": () => loadRules(),
  "/wishlist": () => loadWishlist(),
  "/wishlist/complete": () => loadWishlistComplete(),
  "/register/gear-rating": () => loadRegisterGearRating(),
  "/auction-register": () => loadAuctionRegister(),
  "/admin": () => loadAdminDashboard(),
  "/admin/events": () => loadAdminEvents(),
  "/admin/events/new": () => loadAdminEventsNew(),
  "/admin/items": () => loadAdminItems(),
  "/admin/items/new": () => loadAdminItemsNew(),
  "/admin/members": () => loadAdminMembers(),
  "/admin/rules": () => loadAdminRules(),
};

const dynamicRoutes: { pattern: RegExp; loader: (id: string) => LoaderFn }[] = [
  {
    pattern: /^\/events\/([^/]+)$/,
    loader: (id) => () => loadEventDetail(id),
  },
  {
    pattern: /^\/admin\/events\/([^/]+)$/,
    loader: (id) => () => loadAdminEventDetail(id),
  },
  {
    pattern: /^\/admin\/items\/([^/]+)$/,
    loader: (id) => () => loadAdminItemDetail(id),
  },
];

export async function runPageLoader(
  path: string,
): Promise<PageLoaderResult<unknown>> {
  const normalized = path.split("?")[0]?.replace(/\/+$/, "") || "/";
  const routePath = normalized === "" ? "/" : normalized;

  const staticLoader = staticRoutes[routePath];
  if (staticLoader) {
    return staticLoader();
  }

  for (const { pattern, loader } of dynamicRoutes) {
    const match = routePath.match(pattern);
    if (match?.[1]) {
      return loader(match[1])();
    }
  }

  return notFound();
}

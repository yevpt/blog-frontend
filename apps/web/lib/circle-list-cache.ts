import type { UserListItemResp, UserPageResp } from "@repo/api";

export interface CircleListCacheEntry {
  users: UserListItemResp[];
  currentPage: number;
  totalPages: number;
  endReached: boolean;
}

let cache: CircleListCacheEntry | undefined;

export function getCircleListCache(): CircleListCacheEntry | undefined {
  return cache;
}

export function setCircleListCache(entry: CircleListCacheEntry): void {
  cache = entry;
}

export function shouldRestoreCircleListCache(
  cached: CircleListCacheEntry,
  initialPage: UserPageResp,
): boolean {
  return cached.currentPage > 1 || cached.users.length > initialPage.list.length;
}

export function resolveBootCircleListState(initialPage: UserPageResp): CircleListCacheEntry {
  const cached = getCircleListCache();
  if (cached && shouldRestoreCircleListCache(cached, initialPage)) {
    return cached;
  }
  return {
    users: initialPage.list,
    currentPage: initialPage.page,
    totalPages: initialPage.pages,
    endReached: initialPage.page >= initialPage.pages,
  };
}

/** 测试复位用 */
export function clearCircleListCache(): void {
  cache = undefined;
}

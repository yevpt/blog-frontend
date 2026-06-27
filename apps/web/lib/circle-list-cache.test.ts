import { describe, it, expect, beforeEach } from "vitest";
import type { UserPageResp } from "@repo/api";
import {
  clearCircleListCache,
  getCircleListCache,
  resolveBootCircleListState,
  setCircleListCache,
  shouldRestoreCircleListCache,
} from "./circle-list-cache";

const initialPage: UserPageResp = {
  total: 4,
  pages: 2,
  page: 1,
  page_size: 2,
  list: [
    { id: 1, nickname: "用户一", avatar_url: "", roles: [], last_login_at: undefined },
    { id: 2, nickname: "用户二", avatar_url: "", roles: [], last_login_at: undefined },
  ],
};

describe("circle-list-cache", () => {
  beforeEach(() => {
    clearCircleListCache();
  });

  it("shouldRestoreCircleListCache 在已加载更多页时返回 true", () => {
    expect(
      shouldRestoreCircleListCache(
        {
          users: [
            ...initialPage.list,
            { id: 3, nickname: "用户三", avatar_url: "", roles: [], last_login_at: undefined },
          ],
          currentPage: 2,
          totalPages: 2,
          endReached: true,
        },
        initialPage,
      ),
    ).toBe(true);
  });

  it("shouldRestoreCircleListCache 在仅首屏数据时返回 false", () => {
    expect(
      shouldRestoreCircleListCache(
        {
          users: initialPage.list,
          currentPage: 1,
          totalPages: 2,
          endReached: false,
        },
        initialPage,
      ),
    ).toBe(false);
  });

  it("resolveBootCircleListState 有缓存时恢复已加载列表", () => {
    setCircleListCache({
      users: [
        ...initialPage.list,
        { id: 3, nickname: "用户三", avatar_url: "", roles: [], last_login_at: undefined },
      ],
      currentPage: 2,
      totalPages: 2,
      endReached: true,
    });

    const boot = resolveBootCircleListState(initialPage);
    expect(boot.users).toHaveLength(3);
    expect(boot.currentPage).toBe(2);
    expect(boot.endReached).toBe(true);
  });

  it("读写缓存", () => {
    setCircleListCache({
      users: initialPage.list,
      currentPage: 1,
      totalPages: 2,
      endReached: false,
    });

    expect(getCircleListCache()?.currentPage).toBe(1);
  });

  it("clearCircleListCache 复位缓存", () => {
    setCircleListCache({
      users: initialPage.list,
      currentPage: 2,
      totalPages: 2,
      endReached: false,
    });

    clearCircleListCache();
    expect(getCircleListCache()).toBeUndefined();
  });
});

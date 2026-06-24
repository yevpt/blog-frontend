import type { LikedContentFilter, UserLikedContentPageResp } from "@repo/api";
import { buildQuery } from "@/lib/query";

/** 点赞 Tab 首屏分页大小 */
export const PROFILE_LIKES_PAGE_SIZE = 20;

export type LikedContentUiFilter = "all" | LikedContentFilter;

export function mapUiFilterToApiType(filter: LikedContentUiFilter): LikedContentFilter | undefined {
  if (filter === "all") {
    return undefined;
  }
  return filter;
}

export interface UserLikedContentQuery {
  userId: number;
  page: number;
  pageSize: number;
  filter: LikedContentUiFilter;
}

export function buildUserLikedContentUrl(query: UserLikedContentQuery): string {
  const apiType = mapUiFilterToApiType(query.filter);
  const qs = buildQuery({
    page: query.page,
    page_size: query.pageSize,
    type: apiType,
  });
  return `/api/users/${query.userId}/likes?${qs}`;
}

export const EMPTY_LIKED_CONTENT_PAGE: UserLikedContentPageResp = {
  total: 0,
  pages: 0,
  page: 1,
  page_size: PROFILE_LIKES_PAGE_SIZE,
  list: [],
};

import type { MomentPageResp } from "@repo/api";

/** 个人页碎语 Tab 首屏分页大小 */
export const PROFILE_MOMENTS_PAGE_SIZE = 10;

export const EMPTY_MOMENTS_PAGE: MomentPageResp = {
  total: 0,
  pages: 0,
  page: 1,
  page_size: PROFILE_MOMENTS_PAGE_SIZE,
  list: [],
};

export function formatProfileMomentsTabLabel(total: number): string {
  return `碎语 (${total})`;
}

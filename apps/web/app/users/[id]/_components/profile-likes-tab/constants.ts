export { PROFILE_LIKES_PAGE_SIZE } from "@/hooks/use-user-liked-content.shared";

/** 首屏骨架屏条数 */
export const PROFILE_LIKES_SKELETON_COUNT = 6;

export function formatProfileLikesTabLabel(count: number): string {
  return `点赞 (${count})`;
}

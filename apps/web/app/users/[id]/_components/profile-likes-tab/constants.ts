export { PROFILE_LIKES_PAGE_SIZE } from "@/hooks/use-user-liked-content.shared";

export function formatProfileLikesTabLabel(count: number): string {
  return `点赞 (${count})`;
}

export { shouldShowProfileTabEndMessage as shouldShowProfileLikesEndMessage } from "../profile-tab-end-message";

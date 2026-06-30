import type {
  CommentItemResp,
  CommentReplyResp,
  CommentUserResp,
  GuestbookItemResp,
  UserDetailResp,
} from "@repo/api";

/** 将 session profile 映射为评论/留言模块共用的用户快照。 */
export function profileToUgcUser(profile: UserDetailResp): CommentUserResp {
  return {
    id: profile.id,
    username: profile.username,
    nickname: profile.nickname,
    avatar_url: profile.avatar_url,
    site: profile.site,
    mark: profile.mark,
    roles: profile.roles,
  };
}

function hasDisplayableAuthor(user: CommentUserResp | undefined): boolean {
  return Boolean(user && (user.nickname?.trim() || user.username?.trim()));
}

function canEnrichAsSessionAuthor(
  authorId: number,
  user: CommentUserResp | undefined,
  sessionUserId: number | null,
  profile: UserDetailResp | null,
): profile is UserDetailResp {
  if (hasDisplayableAuthor(user)) {
    return false;
  }
  if (sessionUserId == null || profile == null) {
    return false;
  }
  return authorId === sessionUserId;
}

/** POST/PATCH 响应缺 user 时，用当前 session 补全作者展示信息。 */
export function enrichCommentAuthor(
  comment: CommentItemResp,
  sessionUserId: number | null,
  profile: UserDetailResp | null,
): CommentItemResp {
  if (!canEnrichAsSessionAuthor(comment.user_id, comment.user, sessionUserId, profile)) {
    return comment;
  }
  return { ...comment, user: profileToUgcUser(profile) };
}

export function enrichGuestbookAuthor(
  item: GuestbookItemResp,
  sessionUserId: number | null,
  profile: UserDetailResp | null,
): GuestbookItemResp {
  if (!canEnrichAsSessionAuthor(item.from_user_id, item.user, sessionUserId, profile)) {
    return item;
  }
  return { ...item, user: profileToUgcUser(profile) };
}

export function enrichReplyFromAuthor(
  reply: CommentReplyResp,
  sessionUserId: number | null,
  profile: UserDetailResp | null,
): CommentReplyResp {
  if (!canEnrichAsSessionAuthor(reply.from_user_id, reply.from_user, sessionUserId, profile)) {
    return reply;
  }
  return { ...reply, from_user: profileToUgcUser(profile) };
}

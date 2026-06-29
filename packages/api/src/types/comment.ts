// packages/api/src/types/comment.ts
import type { ModerationView } from "./moderation";

export interface CommentUserResp {
  id: number;
  username: string;
  nickname?: string;
  avatar_url?: string;
  site?: string;
  mark?: string;
  roles?: string[];
}

export interface CommentReplyResp {
  id: number;
  target_type: string;
  comment_id: number;
  from_user_id: number;
  to_user_id: number;
  parent_reply_id: number;
  content: string;
  from_user?: CommentUserResp;
  to_user?: CommentUserResp;
  like_count: number;
  is_liked: boolean;
  moderation?: ModerationView;
  created_at: string;
  updated_at: string;
}

export interface CommentItemResp {
  id: number;
  target_type: string;
  target_id: number;
  user_id: number;
  content: string;
  user?: CommentUserResp;
  reply_count: number;
  like_count: number;
  is_liked: boolean;
  moderation?: ModerationView;
  created_at: string;
  updated_at: string;
}

export interface CommentPageResp {
  total: number;
  pages: number;
  page: number;
  page_size: number;
  list: CommentItemResp[];
}

export type AdminCommentTargetType = "all" | "article" | "moment";

export interface AdminCommentListReq {
  page?: number;
  page_size?: number;
  target_type?: AdminCommentTargetType;
  search?: string;
}

export interface AdminCommentPageResp {
  total: number;
  pages: number;
  page: number;
  page_size: number;
  list: Array<CommentItemResp & { target_type: Exclude<AdminCommentTargetType, "all"> }>;
}

export interface CommentReplyPageResp {
  total: number;
  pages: number;
  page: number;
  page_size: number;
  list: CommentReplyResp[];
}

export interface CommentListReq {
  page?: number;
  page_size?: number;
}

export interface CommentReplyListReq {
  page?: number;
  page_size?: number;
}

export interface CommentCreateReq {
  content: string;
}

export interface CommentReplyCreateReq {
  parent_reply_id?: number;
  content: string;
}

export interface CommentLikeResp {
  is_liked: boolean;
  like_count: number;
}

export interface CommentDeleteResp {
  id: number;
}

export interface CommentUserResp {
  id: number;
  username: string;
  nickname?: string;
  avatar_url?: string;
  site?: string;
  mark?: string;
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
  replies: CommentReplyResp[];
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

export interface CommentListReq {
  target_type: string;
  target_id: number;
  page?: number;
  page_size?: number;
}

export interface CommentCreateReq {
  target_type: string;
  target_id: number;
  content: string;
}

export interface CommentReplyCreateReq {
  target_type: string;
  parent_reply_id?: number;
  content: string;
}

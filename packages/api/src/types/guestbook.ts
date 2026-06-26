// packages/api/src/types/guestbook.ts
export interface GuestbookUserResp {
  id: number;
  username: string;
  nickname?: string;
  avatar_url?: string;
  site?: string;
  mark?: string;
  roles?: string[];
}

export interface GuestbookItemResp {
  id: number;
  owner_user_id: number;
  from_user_id: number;
  content: string;
  user?: GuestbookUserResp;
  reply_count: number;
  like_count: number;
  is_liked: boolean;
  created_at: string;
  updated_at: string;
}

export interface GuestbookPageResp {
  total: number;
  pages: number;
  page: number;
  page_size: number;
  list: GuestbookItemResp[];
}

export interface AdminGuestbookListReq {
  page?: number;
  page_size?: number;
  search?: string;
}

export interface AdminGuestbookPageResp {
  total: number;
  pages: number;
  page: number;
  page_size: number;
  list: GuestbookItemResp[];
}

export interface GuestbookListReq {
  owner_user_id?: number;
  page?: number;
  page_size?: number;
}

export interface GuestbookCreateReq {
  owner_user_id?: number;
  content: string;
}

export interface GuestbookLikeResp {
  id: number;
  is_liked: boolean;
  like_count: number;
}

export interface GuestbookDeleteResp {
  id: number;
}

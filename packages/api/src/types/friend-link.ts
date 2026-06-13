export interface FriendLinkItemResp {
  id: number;
  name: string;
  description?: string;
  email?: string;
  phone?: string;
  site: string;
  avatar_url?: string;
  seq: number;
  /** 0=隐藏 1=显示 2=失联 */
  status: 0 | 1 | 2;
  created_at: string;
  updated_at: string;
}

export interface FriendLinkPageResp {
  total: number;
  pages: number;
  page: number;
  page_size: number;
  list: FriendLinkItemResp[];
}

export interface FriendLinkListReq {
  page?: number;
  page_size?: number;
}

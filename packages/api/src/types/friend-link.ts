export type FriendLinkStatus = 0 | 1 | 2;

export interface FriendLinkItemResp {
  id: number;
  name: string;
  description?: string;
  email?: string;
  phone?: string;
  site: string;
  avatar_url?: string;
  seq: number;
  status: FriendLinkStatus;
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

/** 管理端列表查询，支持按 status 过滤 */
export interface FriendLinkAdminListReq extends FriendLinkListReq {
  status?: FriendLinkStatus;
}

/** 新增友链表单字段（logo 文件单独传） */
export interface FriendLinkCreateReq {
  name: string;
  site: string;
  seq: number;
  description?: string;
  email?: string;
  phone?: string;
  status?: FriendLinkStatus;
  logo: File;
}

/** 修改友链表单字段；logo 可选，未传则保留原头像 */
export interface FriendLinkUpdateReq {
  name?: string;
  site?: string;
  seq?: number;
  description?: string;
  email?: string;
  phone?: string;
  status?: FriendLinkStatus;
  logo?: File;
}

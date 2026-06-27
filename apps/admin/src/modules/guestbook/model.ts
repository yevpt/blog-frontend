import type { GuestbookItemResp } from "@repo/api";
import type { AdminListQueryCodec } from "../../lib/admin-list-query";
import {
  hasActiveListPage,
  hasActiveListSearch,
  parseListPage,
  parseListSearch,
  writeListPage,
  writeListSearch,
} from "../../lib/admin-list-query";

export interface AdminGuestbookListFilters {
  search: string;
  [key: string]: string | undefined;
}

export interface AdminGuestbookListQueryState {
  page: number;
  filters: AdminGuestbookListFilters;
}

const DEFAULT_GUESTBOOK_LIST_FILTERS: AdminGuestbookListFilters = {
  search: "",
};

export const DEFAULT_GUESTBOOK_LIST_QUERY_STATE: AdminGuestbookListQueryState = {
  page: 1,
  filters: DEFAULT_GUESTBOOK_LIST_FILTERS,
};

export const guestbookListQueryCodec: AdminListQueryCodec<AdminGuestbookListQueryState> = {
  defaultState: DEFAULT_GUESTBOOK_LIST_QUERY_STATE,
  parse(params) {
    return {
      page: parseListPage(params),
      filters: {
        search: parseListSearch(params, DEFAULT_GUESTBOOK_LIST_FILTERS.search),
      },
    };
  },
  write(state) {
    const params = new URLSearchParams();
    writeListPage(params, state.page);
    writeListSearch(params, state.filters.search);
    return params;
  },
  hasActive(state) {
    return hasActiveListPage(state.page) || hasActiveListSearch(state.filters.search);
  },
};

export interface GuestbookRow {
  id: string;
  ownerUserId: number;
  fromUserId: number;
  authorName: string;
  content: string;
  replyCount: number;
  likeCount: number;
  createdAt: string;
}

export function mapGuestbookToRow(item: GuestbookItemResp): GuestbookRow {
  return {
    id: String(item.id),
    ownerUserId: item.owner_user_id,
    fromUserId: item.from_user_id,
    authorName: item.user?.nickname ?? item.user?.username ?? `用户 #${item.from_user_id}`,
    content: item.content,
    replyCount: item.reply_count,
    likeCount: item.like_count,
    createdAt: formatAdminDateTime(item.created_at),
  };
}

function formatAdminDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

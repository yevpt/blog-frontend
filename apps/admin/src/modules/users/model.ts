import type { UserListItemResp } from "@repo/api";
import type { AdminListQueryCodec } from "../../lib/admin-list-query";
import {
  hasActiveListPage,
  hasActiveListSearch,
  parseListPage,
  parseListSearch,
  writeListPage,
  writeListSearch,
} from "../../lib/admin-list-query";

export interface AdminUserListQueryState {
  page: number;
  search: string;
}

export const DEFAULT_USER_LIST_QUERY_STATE: AdminUserListQueryState = {
  page: 1,
  search: "",
};

export const userListQueryCodec: AdminListQueryCodec<AdminUserListQueryState> = {
  defaultState: DEFAULT_USER_LIST_QUERY_STATE,
  parse(params) {
    return {
      page: parseListPage(params),
      search: parseListSearch(params, DEFAULT_USER_LIST_QUERY_STATE.search),
    };
  },
  write(state) {
    const params = new URLSearchParams();
    writeListPage(params, state.page);
    writeListSearch(params, state.search);
    return params;
  },
  hasActive(state) {
    return hasActiveListPage(state.page) || hasActiveListSearch(state.search);
  },
};

export interface UserRow {
  id: string;
  displayName: string;
  mark?: string;
  roles: string[];
  isVip: boolean;
  isAdmin: boolean;
  isOnline: boolean;
  lastActiveAt: string;
}

export function mapUserToRow(item: UserListItemResp): UserRow {
  const roles = item.roles ?? [];
  return {
    id: String(item.id),
    displayName: item.nickname ?? `用户 #${item.id}`,
    mark: item.mark,
    roles,
    isVip: roles.includes("ROLE_VIP"),
    isAdmin: roles.includes("ROLE_ADMIN"),
    isOnline: item.is_online ?? false,
    lastActiveAt: formatAdminDateTime(item.last_active_at ?? item.last_login_at),
  };
}

export function matchUserSearch(row: UserRow, search: string) {
  const keyword = search.trim().toLowerCase();
  if (!keyword) return true;
  return [row.displayName, row.mark, row.id, row.roles.join(" ")]
    .filter(Boolean)
    .some((value) => String(value).toLowerCase().includes(keyword));
}

function formatAdminDateTime(value?: string) {
  if (!value) return "-";
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

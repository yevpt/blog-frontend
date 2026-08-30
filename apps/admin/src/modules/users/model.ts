import type { AdminUserListItemResp } from "@repo/api";
import type { AdminListQueryCodec } from "../../lib/admin-list-query";
import {
  hasActiveListPage,
  hasActiveStringFilters,
  parseListPage,
  parseStringFilter,
  writeListPage,
  writeStringFilter,
} from "../../lib/admin-list-query";

export interface AdminUserListFilters {
  keyword: string;
  role: string;
  status: string;
  [key: string]: string | undefined;
}

export interface AdminUserListQueryState {
  page: number;
  filters: AdminUserListFilters;
}

const DEFAULT_USER_LIST_FILTERS = {
  keyword: "",
  role: "all",
  status: "all",
} satisfies AdminUserListFilters;

export const DEFAULT_USER_LIST_QUERY_STATE: AdminUserListQueryState = {
  page: 1,
  filters: DEFAULT_USER_LIST_FILTERS,
};

export const userListQueryCodec: AdminListQueryCodec<AdminUserListQueryState> = {
  defaultState: DEFAULT_USER_LIST_QUERY_STATE,
  parse(params) {
    return {
      page: parseListPage(params),
      filters: {
        keyword: parseStringFilter(params, "keyword", DEFAULT_USER_LIST_FILTERS.keyword),
        role: parseStringFilter(params, "role", DEFAULT_USER_LIST_FILTERS.role),
        status: parseStringFilter(params, "status", DEFAULT_USER_LIST_FILTERS.status),
      },
    };
  },
  write(state) {
    const params = new URLSearchParams();
    writeListPage(params, state.page);
    writeStringFilter(params, "keyword", state.filters.keyword, DEFAULT_USER_LIST_FILTERS.keyword);
    writeStringFilter(params, "role", state.filters.role, DEFAULT_USER_LIST_FILTERS.role);
    writeStringFilter(params, "status", state.filters.status, DEFAULT_USER_LIST_FILTERS.status);
    return params;
  },
  hasActive(state) {
    return (
      hasActiveListPage(state.page) ||
      hasActiveStringFilters(state.filters, DEFAULT_USER_LIST_FILTERS)
    );
  },
};

export interface UserRow {
  id: string;
  username: string;
  displayName: string;
  email?: string;
  mark?: string;
  roles: string[];
  isVip: boolean;
  isAdmin: boolean;
  isOnline: boolean;
  accountStatus: "active" | "disabled";
  sanctionState: "active" | "muted" | "banned";
  lastActiveAt: string;
  registerAt: string;
}

export function mapUserToRow(item: AdminUserListItemResp): UserRow {
  const roles = item.roles ?? [];
  return {
    id: String(item.id),
    username: item.username,
    displayName: item.nickname ?? `用户 #${item.id}`,
    email: item.email,
    mark: item.mark,
    roles,
    isVip: roles.includes("ROLE_VIP"),
    isAdmin: roles.includes("ROLE_ADMIN"),
    isOnline: item.is_online ?? false,
    accountStatus: item.status === 1 ? "active" : "disabled",
    sanctionState: item.sanction_state,
    lastActiveAt: formatAdminDateTime(item.last_active_at ?? item.last_login_at),
    registerAt: formatAdminDateTime(item.created_at),
  };
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

export function getAccountStatusBadge(row: UserRow): {
  label: string;
  variant: "secondary" | "error";
} {
  return row.accountStatus === "active"
    ? { label: "正常", variant: "secondary" }
    : { label: "已禁用", variant: "error" };
}

export function getSanctionBadge(row: UserRow): {
  label: string;
  variant: "secondary" | "warning" | "error";
} {
  switch (row.sanctionState) {
    case "muted":
      return { label: "禁言", variant: "warning" };
    case "banned":
      return { label: "封禁", variant: "error" };
    default:
      return { label: "正常", variant: "secondary" };
  }
}

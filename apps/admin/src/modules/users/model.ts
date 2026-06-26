import type { UserListItemResp } from "@repo/api";

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

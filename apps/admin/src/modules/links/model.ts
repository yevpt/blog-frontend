import type {
  FriendLinkCreateReq,
  FriendLinkItemResp,
  FriendLinkStatus,
  FriendLinkUpdateReq,
} from "@repo/api";
import type { DataTableState } from "@repo/ui";
import { createClientTableQueryCodec } from "../../lib/admin-list-query";

/** 选图后、压缩前原始体积上限，对齐后端 MaxFriendLinkLogoBytes */
export const FRIEND_LINK_LOGO_RAW_MAX_BYTES = 2 * 1024 * 1024;

export interface FriendLinkRow {
  id: string;
  name: string;
  description?: string;
  email?: string;
  phone?: string;
  site: string;
  avatarUrl?: string;
  seq: number;
  status: FriendLinkStatus;
  updatedAt: string;
}

export interface FriendLinkFormValues {
  name: string;
  site: string;
  seq: string;
  status: string;
  description: string;
  email: string;
  phone: string;
}

/** 友链 Logo：本地新文件或编辑时保留的远程图 */
export interface FriendLinkLogoValue {
  file?: File;
  remoteUrl?: string;
  previewUrl: string;
}

export type FriendLinkFormErrors = Partial<Record<keyof FriendLinkFormValues, string>> & {
  logo?: string;
};

export interface FriendLinkStatusCounts {
  total: number;
  visible: number;
  hidden: number;
  disconnected: number;
}

export interface StatusFilterOption {
  value: string;
  label: string;
}

export const FRIEND_LINK_STATUS_FILTER_OPTIONS: StatusFilterOption[] = [
  { value: "all", label: "全部状态" },
  { value: "1", label: "显示" },
  { value: "0", label: "隐藏" },
  { value: "2", label: "失联" },
];

export const friendLinkStatusText: Record<FriendLinkStatus, string> = {
  0: "隐藏",
  1: "显示",
  2: "失联",
};

export const friendLinkStatusVariant: Record<FriendLinkStatus, "success" | "secondary" | "error"> =
  {
    0: "secondary",
    1: "success",
    2: "error",
  };

export function createEmptyFriendLinkForm(nextSeq = 0): FriendLinkFormValues {
  return {
    name: "",
    site: "",
    seq: String(nextSeq),
    status: "1",
    description: "",
    email: "",
    phone: "",
  };
}

export function createRemoteLogoValue(avatarUrl: string): FriendLinkLogoValue {
  return {
    remoteUrl: avatarUrl,
    previewUrl: avatarUrl,
  };
}

function formatAdminDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

export function mapFriendLinkToRow(item: FriendLinkItemResp): FriendLinkRow {
  return {
    id: String(item.id),
    name: item.name,
    description: item.description,
    email: item.email,
    phone: item.phone,
    site: item.site,
    avatarUrl: item.avatar_url,
    seq: item.seq,
    status: item.status,
    updatedAt: formatAdminDate(item.updated_at),
  };
}

export function mapFriendLinkToFormValues(item: FriendLinkItemResp): FriendLinkFormValues {
  return {
    name: item.name,
    site: item.site,
    seq: String(item.seq),
    status: String(item.status),
    description: item.description ?? "",
    email: item.email ?? "",
    phone: item.phone ?? "",
  };
}

export function mapRowToFriendLinkItem(row: FriendLinkRow): FriendLinkItemResp {
  return {
    id: Number(row.id),
    name: row.name,
    description: row.description,
    email: row.email,
    phone: row.phone,
    site: row.site,
    avatar_url: row.avatarUrl,
    seq: row.seq,
    status: row.status,
    created_at: "",
    updated_at: "",
  };
}

export function suggestNextSeq(items: FriendLinkItemResp[]): number {
  if (items.length === 0) return 0;
  return Math.max(...items.map((item) => item.seq)) + 1;
}

function isValidSiteUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function hasFriendLinkLogo(logo: FriendLinkLogoValue | null): boolean {
  return Boolean(logo?.file || logo?.remoteUrl);
}

export function validateFriendLinkForm(
  values: FriendLinkFormValues,
  logo: FriendLinkLogoValue | null,
  mode: "create" | "edit",
): FriendLinkFormErrors {
  const errors: FriendLinkFormErrors = {};
  if (!values.name.trim()) {
    errors.name = "请输入网站名称";
  }
  const site = values.site.trim();
  if (!site) {
    errors.site = "请输入网站地址";
  } else if (!isValidSiteUrl(site)) {
    errors.site = "请输入有效的 http(s) 网址";
  }
  const seq = Number(values.seq);
  if (!Number.isInteger(seq) || seq < 0) {
    errors.seq = "排序必须是非负整数";
  }
  if (!["0", "1", "2"].includes(values.status)) {
    errors.status = "请选择有效状态";
  }
  if (mode === "create" && !logo?.file) {
    errors.logo = "请上传友链 Logo";
  }
  if (mode === "edit" && !hasFriendLinkLogo(logo)) {
    errors.logo = "请上传友链 Logo";
  }
  return errors;
}

export function hasFriendLinkFormErrors(errors: FriendLinkFormErrors): boolean {
  return Object.keys(errors).length > 0;
}

export function toFriendLinkCreateReq(
  values: FriendLinkFormValues,
  logo: FriendLinkLogoValue,
): FriendLinkCreateReq {
  if (!logo.file) {
    throw new Error("创建友链必须上传 Logo");
  }
  const req: FriendLinkCreateReq = {
    name: values.name.trim(),
    site: values.site.trim(),
    seq: Number(values.seq),
    status: Number(values.status) as FriendLinkStatus,
    logo: logo.file,
  };
  const description = values.description.trim();
  const email = values.email.trim();
  const phone = values.phone.trim();
  if (description) req.description = description;
  if (email) req.email = email;
  if (phone) req.phone = phone;
  return req;
}

export function toFriendLinkUpdateReq(
  values: FriendLinkFormValues,
  logo: FriendLinkLogoValue | null,
): FriendLinkUpdateReq {
  const req: FriendLinkUpdateReq = {
    name: values.name.trim(),
    site: values.site.trim(),
    seq: Number(values.seq),
    status: Number(values.status) as FriendLinkStatus,
    description: values.description.trim(),
    email: values.email.trim(),
    phone: values.phone.trim(),
  };
  if (logo?.file) {
    req.logo = logo.file;
  }
  return req;
}

export function matchFriendLinkSearch(row: FriendLinkRow, keyword: string): boolean {
  const normalized = keyword.trim().toLowerCase();
  if (!normalized) return true;
  return (
    row.name.toLowerCase().includes(normalized) ||
    row.site.toLowerCase().includes(normalized) ||
    (row.description?.toLowerCase().includes(normalized) ?? false)
  );
}

function matchFriendLinkStatus(row: FriendLinkRow, statusFilter: string): boolean {
  if (statusFilter === "all") return true;
  return String(row.status) === statusFilter;
}

export function filterAndSortFriendLinkRows(
  rows: FriendLinkRow[],
  state: DataTableState,
): FriendLinkRow[] {
  const keyword = state.searchValue.trim();
  const statusFilter = String(state.filters.status ?? "all");
  const filtered = rows.filter(
    (row) => matchFriendLinkSearch(row, keyword) && matchFriendLinkStatus(row, statusFilter),
  );

  if (!state.sort) return filtered;

  const { column, direction } = state.sort;
  const sorted = [...filtered].sort((a, b) => {
    let result = 0;
    if (column === "seq") {
      result = a.seq - b.seq;
    } else if (column === "name") {
      result = a.name.localeCompare(b.name, "zh-Hans-CN");
    } else if (column === "updatedAt") {
      result = a.updatedAt.localeCompare(b.updatedAt, "zh-Hans-CN");
    }
    return direction === "descending" ? -result : result;
  });

  return sorted;
}

export function countFriendLinksByStatus(rows: FriendLinkRow[]): FriendLinkStatusCounts {
  return rows.reduce<FriendLinkStatusCounts>(
    (counts, row) => {
      counts.total += 1;
      if (row.status === 1) counts.visible += 1;
      if (row.status === 0) counts.hidden += 1;
      if (row.status === 2) counts.disconnected += 1;
      return counts;
    },
    { total: 0, visible: 0, hidden: 0, disconnected: 0 },
  );
}

export const FRIEND_LINK_TABLE_DEFAULT_STATE: DataTableState = {
  searchValue: "",
  filters: { status: "all" },
  sort: { column: "seq", direction: "ascending" },
};

export const friendLinkTableQueryCodec = createClientTableQueryCodec({
  defaultState: FRIEND_LINK_TABLE_DEFAULT_STATE,
  sortColumns: ["seq", "name", "updatedAt"],
});

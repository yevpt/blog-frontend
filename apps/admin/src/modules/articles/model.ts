import type { AdminArticleListItemResp, ArticleListSortBy, ArticleListSortOrder } from "@repo/api";
import type { DataTableSortDirection, DataTableSortState } from "@repo/ui";
import type { AdminListQueryCodec } from "../../lib/admin-list-query";
import {
  hasActiveListPage,
  hasActiveListSearch,
  hasActiveListSort,
  hasActiveStringFilters,
  parseListPage,
  parseListSearch,
  parseListSort,
  parseStringFilter,
  writeListPage,
  writeListSearch,
  writeListSort,
  writeStringFilter,
} from "../../lib/admin-list-query";

/** 与后端 status(0 隐藏 / 1 公开 / 2 加密) 及软删除对齐 */
export type ArticleStatus = "published" | "hidden" | "encrypted" | "archived";

/** 支持服务端排序的表格列 id */
export type ArticleTableSortColumn = "createdAt" | "updatedAt" | "category" | "status" | "pinned";

export interface ArticleTableSort {
  column: ArticleTableSortColumn;
  direction: DataTableSortDirection;
}

export interface ArticleRow {
  id: string;
  title: string;
  excerpt: string;
  status: ArticleStatus;
  category: string;
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FilterOption<T extends string = string> {
  value: T;
  label: string;
}

export interface AdminArticleListFilters {
  categoryId: string;
  search: string;
  [key: string]: string | undefined;
}

export interface AdminArticleListQueryState {
  page: number;
  filters: AdminArticleListFilters;
  sort?: DataTableSortState;
}

const ARTICLE_TABLE_SORT_COLUMNS: ArticleTableSortColumn[] = [
  "createdAt",
  "updatedAt",
  "category",
  "status",
  "pinned",
];

const DEFAULT_ARTICLE_LIST_FILTERS: AdminArticleListFilters = {
  categoryId: "all",
  search: "",
};

export const DEFAULT_ARTICLE_LIST_QUERY_STATE: AdminArticleListQueryState = {
  page: 1,
  filters: DEFAULT_ARTICLE_LIST_FILTERS,
};

/** 列表是否存在非默认的搜索、筛选、排序或分页配置 */
export function hasActiveArticleListQuery(state: AdminArticleListQueryState): boolean {
  return articleListQueryCodec.hasActive(state);
}

export const articleListQueryCodec: AdminListQueryCodec<AdminArticleListQueryState> = {
  defaultState: DEFAULT_ARTICLE_LIST_QUERY_STATE,
  parse(params) {
    return {
      page: parseListPage(params),
      filters: {
        categoryId: parseStringFilter(params, "category", DEFAULT_ARTICLE_LIST_FILTERS.categoryId),
        search: parseListSearch(params, DEFAULT_ARTICLE_LIST_FILTERS.search),
      },
      sort: parseListSort(params, ARTICLE_TABLE_SORT_COLUMNS),
    };
  },
  write(state) {
    const params = new URLSearchParams();
    writeListPage(params, state.page);
    writeListSearch(params, state.filters.search);
    writeStringFilter(
      params,
      "category",
      state.filters.categoryId,
      DEFAULT_ARTICLE_LIST_FILTERS.categoryId,
    );
    writeListSort(params, state.sort);
    return params;
  },
  hasActive(state) {
    return (
      hasActiveListPage(state.page) ||
      hasActiveListSearch(state.filters.search) ||
      hasActiveStringFilters(state.filters, {
        categoryId: DEFAULT_ARTICLE_LIST_FILTERS.categoryId,
      }) ||
      hasActiveListSort(state.sort)
    );
  },
};

/** 从 URL 查询参数解析文章列表状态 */
export function parseArticleListSearchParams(params: URLSearchParams): AdminArticleListQueryState {
  return articleListQueryCodec.parse(params);
}

/** 将文章列表状态写入 URL 查询参数（省略默认值以保持 URL 简洁） */
export function writeArticleListSearchParams(state: AdminArticleListQueryState): URLSearchParams {
  return articleListQueryCodec.write(state);
}

export function buildArticleEditorLinkState(listSearch: string) {
  return listSearch ? { listSearch } : {};
}

export const articleStatusText: Record<ArticleStatus, string> = {
  published: "已发布",
  hidden: "隐藏",
  encrypted: "加密",
  archived: "已删除",
};

export const articleStatusVariant: Record<
  ArticleStatus,
  "success" | "secondary" | "warning" | "outline"
> = {
  published: "success",
  hidden: "secondary",
  encrypted: "warning",
  archived: "outline",
};

const COLUMN_TO_SORT_BY: Record<ArticleTableSortColumn, ArticleListSortBy> = {
  createdAt: "created_at",
  updatedAt: "updated_at",
  category: "category",
  status: "status",
  pinned: "recommended",
};

const ALL_FILTER_OPTION: FilterOption = { value: "all", label: "全部" };

/** 服务端排序列配置：保留排序 UI，不在前端重排 */
export const serverSideColumnSort = {
  defaultDirection: "descending" as const,
  value: () => "",
};

/** 将带 id/name 的资源列表转为表头筛选选项 */
export function buildIdFilterOptions(items: Array<{ id: number; name: string }>): FilterOption[] {
  return [
    ALL_FILTER_OPTION,
    ...items.map((item) => ({ value: String(item.id), label: item.name })),
  ];
}

export function parseOptionalIdFilter(value: string): number | undefined {
  if (value === "all") return undefined;
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : undefined;
}

export function toArticleListSortBy(column: string): ArticleListSortBy {
  return COLUMN_TO_SORT_BY[column as ArticleTableSortColumn];
}

export function toArticleListSortOrder(direction: DataTableSortDirection): ArticleListSortOrder {
  return direction === "ascending" ? "asc" : "desc";
}

/** 服务端筛选模式下，DataTable 列 filter.match 恒为 true */
export function passThroughFilter<T>(_item: T, _value: string) {
  return true;
}

function mapBackendStatus(item: AdminArticleListItemResp): ArticleStatus {
  if (item.deleted_at) return "archived";
  switch (item.status) {
    case 1:
      return "published";
    case 2:
      return "encrypted";
    default:
      return "hidden";
  }
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

/** 将管理端列表项映射为表格行 */
export function mapAdminArticleToRow(item: AdminArticleListItemResp): ArticleRow {
  return {
    id: String(item.id),
    title: item.title,
    excerpt: item.short_content?.trim() || "—",
    status: mapBackendStatus(item),
    category: item.category?.name ?? "—",
    isPinned: item.is_recommended,
    createdAt: formatAdminDate(item.created_at),
    updatedAt: formatAdminDate(item.updated_at),
  };
}

import type {
  AdminArticleListItemResp,
  CategoryCreateReq,
  CategoryTabItem,
  CategoryUpdateReq,
} from "@repo/api";
import type { DataTableState } from "@repo/ui";
import { createClientTableQueryCodec } from "../../lib/admin-list-query";

export interface CategoryRow {
  id: string;
  name: string;
  url?: string;
  icon?: string;
  description?: string;
  coverImgUrl?: string;
  seq: number;
  articleCount: number;
}

/** 素材提交引用与预览 URL 分离，禁止将 blob URL 作为提交值 */
export interface CategoryAssetValue {
  submitValue: string;
  previewUrl: string;
}

export const EMPTY_CATEGORY_ASSET: CategoryAssetValue = { submitValue: "", previewUrl: "" };

export interface CategoryFormDirtyFlags {
  description: boolean;
  icon: boolean;
  coverImgUrl: boolean;
}

export interface CategoryFormValues {
  name: string;
  url: string;
  seq: string;
  icon: CategoryAssetValue;
  description: string;
  coverImgUrl: CategoryAssetValue;
  dirty: CategoryFormDirtyFlags;
}

export type CategoryFormErrors = Partial<
  Record<"name" | "seq" | "description" | "icon" | "coverImgUrl", string>
>;

const EMPTY_DIRTY: CategoryFormDirtyFlags = {
  description: false,
  icon: false,
  coverImgUrl: false,
};

export function createCategoryAssetFromUrl(url: string): CategoryAssetValue {
  return { submitValue: url, previewUrl: url };
}

export function createCategoryAssetFromUpload(key: string, url: string): CategoryAssetValue {
  return { submitValue: key, previewUrl: url };
}

function isBlobUrl(value: string): boolean {
  return value.startsWith("blob:");
}

function resolveAssetSubmitValue(asset: CategoryAssetValue): string {
  const value = asset.submitValue.trim();
  if (!value || isBlobUrl(value)) return "";
  return value;
}

export function createEmptyCategoryForm(nextSeq = 0): CategoryFormValues {
  return {
    name: "",
    url: "",
    seq: String(nextSeq),
    icon: EMPTY_CATEGORY_ASSET,
    description: "",
    coverImgUrl: EMPTY_CATEGORY_ASSET,
    dirty: { ...EMPTY_DIRTY },
  };
}

export function mapCategoryToRow(item: CategoryTabItem): CategoryRow {
  return {
    id: String(item.id),
    name: item.name,
    url: item.url,
    icon: item.icon,
    description: item.description,
    coverImgUrl: item.cover_img_url,
    seq: item.seq,
    articleCount: item.article_count,
  };
}

export function mapCategoryToFormValues(item: CategoryTabItem): CategoryFormValues {
  return {
    name: item.name,
    url: item.url ?? "",
    seq: String(item.seq),
    icon: item.icon ? createCategoryAssetFromUrl(item.icon) : EMPTY_CATEGORY_ASSET,
    description: item.description ?? "",
    coverImgUrl: item.cover_img_url
      ? createCategoryAssetFromUrl(item.cover_img_url)
      : EMPTY_CATEGORY_ASSET,
    dirty: { ...EMPTY_DIRTY },
  };
}

export function suggestNextSeq(items: CategoryTabItem[]): number {
  if (items.length === 0) return 0;
  return Math.max(...items.map((item) => item.seq)) + 1;
}

export function validateCategoryForm(values: CategoryFormValues): CategoryFormErrors {
  const errors: CategoryFormErrors = {};
  if (!values.name.trim()) {
    errors.name = "请输入分类名称";
  }
  const seq = Number(values.seq);
  if (!Number.isInteger(seq) || seq < 0) {
    errors.seq = "排序必须是非负整数";
  }
  return errors;
}

export function hasCategoryFormErrors(errors: CategoryFormErrors): boolean {
  return Object.keys(errors).length > 0;
}

export function toCategoryCreateReq(values: CategoryFormValues): CategoryCreateReq {
  const req: CategoryCreateReq = {
    name: values.name.trim(),
    seq: Number(values.seq),
  };
  const url = values.url.trim();
  if (url) req.url = url;
  const description = values.description.trim();
  if (description) req.description = description;
  const icon = resolveAssetSubmitValue(values.icon);
  if (icon) req.icon = icon;
  const cover = resolveAssetSubmitValue(values.coverImgUrl);
  if (cover) req.cover_img_url = cover;
  return req;
}

export function toCategoryUpdateReq(values: CategoryFormValues): CategoryUpdateReq {
  const req: CategoryUpdateReq = {
    name: values.name.trim(),
    url: values.url.trim(),
    seq: Number(values.seq),
  };

  if (values.dirty.description) {
    req.description = values.description.trim();
  } else {
    const description = values.description.trim();
    if (description) req.description = description;
  }

  if (values.dirty.icon) {
    req.icon = resolveAssetSubmitValue(values.icon);
  }

  if (values.dirty.coverImgUrl) {
    req.cover_img_url = resolveAssetSubmitValue(values.coverImgUrl);
  }

  return req;
}

export interface CategoryArticleRow {
  id: string;
  title: string;
  excerpt: string;
  /** 添加候选时展示的原分类名 */
  otherCategory?: string;
}

/** 将管理端文章列表项映射为分类文章行 */
export function mapAdminArticleToCategoryArticleRow(
  item: AdminArticleListItemResp,
  currentCategoryId?: number,
): CategoryArticleRow {
  const otherCategory =
    currentCategoryId !== undefined &&
    item.category?.id !== undefined &&
    item.category.id !== currentCategoryId
      ? item.category.name
      : undefined;

  return {
    id: String(item.id),
    title: item.title,
    excerpt: item.short_content?.trim() || "—",
    otherCategory,
  };
}

/** 是否可作为「添加到当前分类」的候选（排除已删除与已在该分类） */
export function isCategoryArticleAddCandidate(
  item: AdminArticleListItemResp,
  categoryId: number,
): boolean {
  if (item.deleted_at) return false;
  return item.category?.id !== categoryId;
}

export function matchCategorySearch(row: CategoryRow, keyword: string): boolean {
  const normalized = keyword.trim().toLowerCase();
  if (!normalized) return true;
  return (
    row.name.toLowerCase().includes(normalized) ||
    (row.url?.toLowerCase().includes(normalized) ?? false) ||
    (row.description?.toLowerCase().includes(normalized) ?? false)
  );
}

export function filterAndSortCategoryRows(
  rows: CategoryRow[],
  state: DataTableState,
): CategoryRow[] {
  const keyword = state.searchValue.trim();
  const filtered = rows.filter((row) => matchCategorySearch(row, keyword));

  if (!state.sort) return filtered;

  const { column, direction } = state.sort;
  const sorted = [...filtered].sort((a, b) => {
    let result = 0;
    if (column === "seq") {
      result = a.seq - b.seq;
    } else if (column === "name") {
      result = a.name.localeCompare(b.name, "zh-Hans-CN");
    } else if (column === "articleCount") {
      result = a.articleCount - b.articleCount;
    }
    return direction === "descending" ? -result : result;
  });

  return sorted;
}

export const CATEGORY_TABLE_DEFAULT_STATE: DataTableState = {
  searchValue: "",
  filters: {},
  sort: { column: "seq", direction: "ascending" },
};

export const categoryTableQueryCodec = createClientTableQueryCodec({
  defaultState: CATEGORY_TABLE_DEFAULT_STATE,
  sortColumns: ["seq", "name", "url", "articleCount"],
});

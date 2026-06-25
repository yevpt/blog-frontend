import type {
  AdminArticleListItemResp,
  CategoryCreateReq,
  CategoryTabItem,
  CategoryUpdateReq,
} from "@repo/api";
import type { DataTableState } from "@repo/ui";

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

export interface CategoryFormValues {
  name: string;
  url: string;
  seq: string;
  icon: string;
  description: string;
  coverImgUrl: string;
}

export type CategoryFormErrors = Partial<Record<keyof CategoryFormValues, string>>;

export function createEmptyCategoryForm(nextSeq = 0): CategoryFormValues {
  return {
    name: "",
    url: "",
    seq: String(nextSeq),
    icon: "",
    description: "",
    coverImgUrl: "",
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
    icon: item.icon ?? "",
    description: item.description ?? "",
    coverImgUrl: item.cover_img_url ?? "",
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
  if (!values.description.trim()) {
    errors.description = "请输入分类描述";
  }
  return errors;
}

export function hasCategoryFormErrors(errors: CategoryFormErrors): boolean {
  return Object.keys(errors).length > 0;
}

export function toCategoryCreateReq(values: CategoryFormValues): CategoryCreateReq {
  const req: CategoryCreateReq = {
    name: values.name.trim(),
    description: values.description.trim(),
    seq: Number(values.seq),
  };
  const url = values.url.trim();
  if (url) req.url = url;
  const icon = values.icon.trim();
  if (icon) req.icon = icon;
  const cover = values.coverImgUrl.trim();
  if (cover) req.cover_img_url = cover;
  return req;
}

export function toCategoryUpdateReq(values: CategoryFormValues): CategoryUpdateReq {
  // 图标与封面后端尚未稳定支持，更新时不触碰这两项。
  return {
    name: values.name.trim(),
    url: values.url.trim(),
    description: values.description.trim(),
    seq: Number(values.seq),
  };
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

export function filterAndSortCategoryRows(rows: CategoryRow[], state: DataTableState): CategoryRow[] {
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

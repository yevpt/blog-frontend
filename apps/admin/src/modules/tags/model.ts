import type { TagCreateReq, TagItemResp, TagUpdateReq } from "@repo/api";
import type { DataTableState } from "@repo/ui";

export interface TagRow {
  id: string;
  name: string;
  url?: string;
  icon?: string;
  description?: string;
  coverImgUrl?: string;
  seq: number;
  articleCount: number;
}

export interface TagFormValues {
  name: string;
  url: string;
  seq: string;
  icon: string;
  description: string;
  coverImgUrl: string;
}

export type TagFormErrors = Partial<Record<keyof TagFormValues, string>>;

export function createEmptyTagForm(nextSeq = 0): TagFormValues {
  return {
    name: "",
    url: "",
    seq: String(nextSeq),
    icon: "",
    description: "",
    coverImgUrl: "",
  };
}

export function mapTagToRow(item: TagItemResp): TagRow {
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

export function mapTagToFormValues(item: TagItemResp): TagFormValues {
  return {
    name: item.name,
    url: item.url ?? "",
    seq: String(item.seq),
    icon: item.icon ?? "",
    description: item.description ?? "",
    coverImgUrl: item.cover_img_url ?? "",
  };
}

export function mapRowToTagItem(row: TagRow): TagItemResp {
  return {
    id: Number(row.id),
    name: row.name,
    url: row.url,
    icon: row.icon,
    description: row.description,
    cover_img_url: row.coverImgUrl,
    seq: row.seq,
    article_count: row.articleCount,
  };
}

export function suggestNextSeq(items: TagItemResp[]): number {
  if (items.length === 0) return 0;
  return Math.max(...items.map((item) => item.seq)) + 1;
}

export function validateTagForm(values: TagFormValues): TagFormErrors {
  const errors: TagFormErrors = {};
  if (!values.name.trim()) {
    errors.name = "请输入标签名称";
  }
  const seq = Number(values.seq);
  if (!Number.isInteger(seq) || seq < 0) {
    errors.seq = "排序必须是非负整数";
  }
  return errors;
}

export function hasTagFormErrors(errors: TagFormErrors): boolean {
  return Object.keys(errors).length > 0;
}

export function toTagCreateReq(values: TagFormValues): TagCreateReq {
  const req: TagCreateReq = {
    name: values.name.trim(),
    seq: Number(values.seq),
  };
  const url = values.url.trim();
  const icon = values.icon.trim();
  const description = values.description.trim();
  const coverImgUrl = values.coverImgUrl.trim();
  if (url) req.url = url;
  if (icon) req.icon = icon;
  if (description) req.description = description;
  if (coverImgUrl) req.cover_img_url = coverImgUrl;
  return req;
}

export function toTagUpdateReq(values: TagFormValues): TagUpdateReq {
  return {
    name: values.name.trim(),
    url: values.url.trim(),
    icon: values.icon.trim(),
    description: values.description.trim(),
    cover_img_url: values.coverImgUrl.trim(),
    seq: Number(values.seq),
  };
}

/** 展示设置未开放时，仅提交基础字段，避免空值覆盖已有素材。 */
export function toTagBasicUpdateReq(values: TagFormValues): TagUpdateReq {
  return {
    name: values.name.trim(),
    url: values.url.trim(),
    seq: Number(values.seq),
  };
}

export function matchTagSearch(row: TagRow, keyword: string): boolean {
  const normalized = keyword.trim().toLowerCase();
  if (!normalized) return true;
  return (
    row.name.toLowerCase().includes(normalized) ||
    (row.url?.toLowerCase().includes(normalized) ?? false)
  );
}

export function filterAndSortTagRows(rows: TagRow[], state: DataTableState): TagRow[] {
  const keyword = state.searchValue.trim();
  const filtered = rows.filter((row) => matchTagSearch(row, keyword));

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

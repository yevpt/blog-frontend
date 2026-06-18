export type ArticleStatus = "published" | "draft" | "reviewing" | "archived";
export type StatusFilter = ArticleStatus | "all";
export type PinnedFilter = "all" | "pinned" | "normal";
export type SortDirection = "ascending" | "descending";

export interface ArticleRow {
  id: string;
  title: string;
  excerpt: string;
  status: ArticleStatus;
  category: string;
  tags: string[];
  isPinned: boolean;
  updatedAt: string;
}

export interface FilterOption<T extends string> {
  value: T;
  label: string;
}

export interface ArticleFilters {
  status: StatusFilter;
  category: string;
  tag: string;
  pinned: PinnedFilter;
}

export const articleStatusText: Record<ArticleStatus, string> = {
  published: "已发布",
  draft: "草稿",
  reviewing: "审核中",
  archived: "已归档",
};

export const articleStatusVariant: Record<
  ArticleStatus,
  "success" | "secondary" | "warning" | "outline"
> = {
  published: "success",
  draft: "secondary",
  reviewing: "warning",
  archived: "outline",
};

// TODO(api): 待后端提供后台文章列表、搜索、筛选、排序与删除接口。
export const articles: ArticleRow[] = [
  {
    id: "react-query-admin-table",
    title: "React Query 与后台表格状态",
    excerpt: "用稳定的数据状态承载后台筛选、分页与刷新。",
    status: "published",
    category: "工程",
    tags: ["React", "表格"],
    isPinned: true,
    updatedAt: "2026-06-16",
  },
  {
    id: "vite-admin-theme",
    title: "Vite 管理后台的主题方案",
    excerpt: "记录后台浅色、深色主题和设计令牌的接入方式。",
    status: "draft",
    category: "前端",
    tags: ["Vite", "主题"],
    isPinned: false,
    updatedAt: "2026-06-15",
  },
  {
    id: "blog-editor-polish",
    title: "把博客编辑器体验打磨到顺手",
    excerpt: "从工具栏、快捷插入和代码块体验梳理编辑器细节。",
    status: "reviewing",
    category: "产品",
    tags: ["编辑器"],
    isPinned: false,
    updatedAt: "2026-06-12",
  },
  {
    id: "old-link-cleanup",
    title: "旧友链清理记录",
    excerpt: "归档长期不可访问的站点链接并保留维护说明。",
    status: "archived",
    category: "站点",
    tags: ["维护"],
    isPinned: false,
    updatedAt: "2026-06-08",
  },
];

export const initialArticleFilters: ArticleFilters = {
  status: "all",
  category: "all",
  tag: "all",
  pinned: "all",
};

export const statusFilterOptions: Array<FilterOption<StatusFilter>> = [
  { value: "all", label: "全部" },
  { value: "published", label: "已发布" },
  { value: "draft", label: "草稿" },
  { value: "reviewing", label: "审核中" },
  { value: "archived", label: "已归档" },
];

export const pinnedFilterOptions: Array<FilterOption<PinnedFilter>> = [
  { value: "all", label: "全部" },
  { value: "pinned", label: "已置顶" },
  { value: "normal", label: "普通" },
];

function uniqueSorted(values: string[]) {
  return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b, "zh-Hans-CN"));
}

function getTextFilterOptions(values: string[]): Array<FilterOption<string>> {
  return [
    { value: "all", label: "全部" },
    ...uniqueSorted(values).map((value) => ({ value, label: value })),
  ];
}

export const categoryFilterOptions = getTextFilterOptions(
  articles.map((article) => article.category),
);

export const tagFilterOptions = getTextFilterOptions(articles.flatMap((article) => article.tags));

export function filterAndSortArticles({
  source,
  filters,
  searchValue,
  sortDirection,
}: {
  source: ArticleRow[];
  filters: ArticleFilters;
  searchValue: string;
  sortDirection: SortDirection;
}) {
  const normalizedSearchValue = searchValue.trim().toLowerCase();

  return source
    .filter((article) => {
      if (filters.status !== "all" && article.status !== filters.status) return false;
      if (filters.category !== "all" && article.category !== filters.category) return false;
      if (filters.tag !== "all" && !article.tags.includes(filters.tag)) return false;
      if (filters.pinned === "pinned" && !article.isPinned) return false;
      if (filters.pinned === "normal" && article.isPinned) return false;
      if (!normalizedSearchValue) return true;

      const searchableText = [article.title, article.excerpt, article.category, ...article.tags]
        .join(" ")
        .toLowerCase();
      return searchableText.includes(normalizedSearchValue);
    })
    .sort((a, b) =>
      sortDirection === "descending"
        ? b.updatedAt.localeCompare(a.updatedAt)
        : a.updatedAt.localeCompare(b.updatedAt),
    );
}

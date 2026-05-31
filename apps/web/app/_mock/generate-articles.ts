import type { Article } from "./types";

const CATEGORIES = ["编程", "工具", "文学"] as const;

/** 首页 mock 文章预设总数 */
export const MOCK_ARTICLE_COUNT = 192;

/** 默认每页条数，与 ArticleSection 保持一致 */
export const MOCK_ARTICLE_PAGE_SIZE = 6;

/** 固定基准日期，避免 Date.now() 在 SSR/CSR 间产生不同时间戳 */
const MOCK_ARTICLE_BASE_TIME = Date.UTC(2026, 5, 1);

const TITLE_TEMPLATES: Record<(typeof CATEGORIES)[number], string[]> = {
  编程: [
    "TypeScript 类型体操实战",
    "React 性能优化指南",
    "Next.js App Router 深入",
    "CSS 现代布局技巧",
    "Node.js 后端实践",
  ],
  工具: [
    "Obsidian 知识库搭建",
    "命令行工具精选",
    "Raycast 插件开发",
    "效率软件推荐",
    "开发环境配置",
  ],
  文学: [
    "读书笔记：挪威的森林",
    "马尔克斯与魔幻现实主义",
    "余华笔下的生存哲学",
    "菲茨杰拉德与美国梦",
    "阅读与写作的边界",
  ],
};

/**
 * 生成指定数量的 mock 文章，用于模拟后端全量数据。
 */
export function generateMockArticles(count = MOCK_ARTICLE_COUNT): Article[] {
  return Array.from({ length: count }, (_, index) => {
    const n = index + 1;
    const category = CATEGORIES[index % CATEGORIES.length];
    const templates = TITLE_TEMPLATES[category];
    const titleBase = templates[index % templates.length];

    return {
      id: String(n),
      title: `${titleBase}（第 ${n} 篇）`,
      excerpt: `这是第 ${n} 篇 mock 文章的摘要，分类为「${category}」。用于模拟后端分页接口返回的数据。`,
      coverImage: `https://picsum.photos/seed/article-${n}/600/400`,
      category,
      publishedAt: new Date(MOCK_ARTICLE_BASE_TIME - n * 86400000),
      views: 800 + n * 23,
      likes: 40 + (n % 80),
      comments: 8 + (n % 25),
      href: `/articles/mock-${n}`,
    };
  });
}

export interface FetchMockArticlesParams {
  page: number;
  pageSize?: number;
  category?: string;
  search?: string;
}

export interface FetchMockArticlesResult {
  items: Article[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * 模拟后端分页 API：先过滤再 slice，返回当前页数据与分页元信息。
 */
export function fetchMockArticles(
  allArticles: Article[],
  params: FetchMockArticlesParams,
): FetchMockArticlesResult {
  const pageSize = params.pageSize ?? MOCK_ARTICLE_PAGE_SIZE;
  let filtered = allArticles;

  if (params.category && params.category !== "全部") {
    filtered = filtered.filter((article) => article.category === params.category);
  }

  if (params.search?.trim()) {
    const query = params.search.trim().toLowerCase();
    filtered = filtered.filter(
      (article) =>
        article.title.toLowerCase().includes(query) ||
        article.excerpt.toLowerCase().includes(query),
    );
  }

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(Math.max(1, params.page), totalPages);
  const start = (page - 1) * pageSize;

  return {
    items: filtered.slice(start, start + pageSize),
    total,
    page,
    pageSize,
    totalPages,
  };
}

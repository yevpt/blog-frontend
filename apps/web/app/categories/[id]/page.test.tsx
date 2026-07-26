// @vitest-environment jsdom
import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, it, expect, vi } from "vitest";
import type { ArticlePageResp, CategoryTabItem } from "@repo/api";
import CategoryDetailPage, { generateMetadata } from "./page";

const NOT_FOUND_ERROR = "NEXT_HTTP_ERROR_FALLBACK;404";

const mockState = vi.hoisted(() => ({
  listTabs: vi.fn(),
  listPublic: vi.fn(),
  notFound: vi.fn(() => {
    throw new Error(NOT_FOUND_ERROR);
  }),
}));

vi.mock("next/navigation", () => ({
  notFound: mockState.notFound,
}));

vi.mock("@/lib/server-api", () => ({
  createServerApiClient: vi.fn(async () => ({
    categories: { listTabs: mockState.listTabs },
    articles: { listPublic: mockState.listPublic },
  })),
}));

vi.mock("@/lib/seo", () => ({
  getCanonicalUrl: (path: string) => new URL(path, "https://example.com"),
}));

vi.mock("@/components/common/page-container", () => ({
  PageContainer: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/categories", () => ({
  CategoryDetailHeader: ({ category }: { category: CategoryTabItem }) => (
    <header data-testid="category-detail-header">{category.name}</header>
  ),
}));

vi.mock("@/components/articles", () => ({
  ArticleSection: ({
    initialPage,
    currentCategoryId,
  }: {
    initialPage: ArticlePageResp;
    currentCategoryId?: number;
  }) => (
    <main data-testid="article-section" data-category-id={currentCategoryId}>
      {initialPage.list.map((a) => (
        <span key={a.id}>{a.title}</span>
      ))}
    </main>
  ),
}));

const category: CategoryTabItem = {
  id: 3,
  name: "编程",
  description: "代码与工程实践",
  seq: 0,
  article_count: 12,
};

function makePage(list: Array<Partial<ArticlePageResp["list"][number]>>): ArticlePageResp {
  return {
    total: list.length,
    pages: 1,
    page: 1,
    page_size: 10,
    list: list.map((a, i) => ({
      id: a.id ?? i + 1,
      title: a.title ?? `文章 ${i + 1}`,
      user_id: 1,
      status: 1,
      comment_status: 1,
      read_count: 0,
      like_count: 0,
      is_liked: false,
      comment_count: 0,
      is_recommended: false,
      created_at: "2024-06-01T00:00:00Z",
      updated_at: "2024-06-01T00:00:00Z",
    })),
  };
}

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe("CategoryDetailPage", () => {
  beforeEach(() => {
    mockState.listTabs.mockReset();
    mockState.listPublic.mockReset();
    mockState.notFound.mockClear();
  });

  it("渲染分类头部与受控文章列表", async () => {
    mockState.listTabs.mockResolvedValue({ list: [category] });
    mockState.listPublic.mockResolvedValue(makePage([{ id: 1, title: "分类文章" }]));

    const element = await CategoryDetailPage(makeParams("3"));
    render(element);

    expect(screen.getByTestId("category-detail-header").textContent).toBe("编程");
    expect(screen.getByTestId("article-section").getAttribute("data-category-id")).toBe("3");
    expect(screen.getByText("分类文章")).toBeTruthy();
    expect(mockState.listPublic).toHaveBeenCalledWith({ page: 1, category_id: 3 });
  });

  it("非法 id 触发 notFound", async () => {
    await expect(CategoryDetailPage(makeParams("abc"))).rejects.toThrow(NOT_FOUND_ERROR);
    expect(mockState.listTabs).not.toHaveBeenCalled();
  });

  it("分类不存在时触发 notFound", async () => {
    mockState.listTabs.mockResolvedValue({ list: [category] });

    await expect(CategoryDetailPage(makeParams("999"))).rejects.toThrow(NOT_FOUND_ERROR);
  });

  it("文章接口失败时降级为空列表", async () => {
    mockState.listTabs.mockResolvedValue({ list: [category] });
    mockState.listPublic.mockRejectedValueOnce(new Error("network error"));

    const element = await CategoryDetailPage(makeParams("3"));
    render(element);

    expect(screen.getByTestId("article-section")).toBeTruthy();
    expect(screen.queryByText("分类文章")).toBeNull();
  });
});

describe("generateMetadata", () => {
  beforeEach(() => {
    mockState.listTabs.mockReset();
  });

  it("返回分类名与描述", async () => {
    mockState.listTabs.mockResolvedValue({ list: [category] });

    const metadata = await generateMetadata(makeParams("3"));

    expect(metadata.title).toBe("编程 | Yevpt's Blog");
    expect(metadata.description).toBe("代码与工程实践");
  });

  it("分类不存在时返回兜底标题", async () => {
    mockState.listTabs.mockResolvedValue({ list: [] });

    const metadata = await generateMetadata(makeParams("999"));

    expect(metadata.title).toBe("分类 | Yevpt's Blog");
  });
});

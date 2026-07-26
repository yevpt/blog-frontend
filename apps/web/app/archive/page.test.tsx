// @vitest-environment jsdom
import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, it, expect, vi } from "vitest";
import type { ArticleListItemResp, ArticlePageResp } from "@repo/api";
import ArchivePageRoute from "./page";

function makeArticle(id: number): ArticleListItemResp {
  return {
    id,
    title: `文章 ${id}`,
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
  };
}

function makePage(
  list: ArticleListItemResp[],
  overrides: Partial<ArticlePageResp> = {},
): ArticlePageResp {
  return { total: list.length, pages: 1, page: 1, page_size: 50, list, ...overrides };
}

const mockListPublic = vi.hoisted(() => vi.fn());

vi.mock("@/lib/server-api", () => ({
  createServerApiClient: vi.fn(async () => ({
    articles: {
      listPublic: mockListPublic,
    },
  })),
}));

vi.mock("@/components/common/page-container", () => ({
  PageContainer: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/archive", () => ({
  ArchivePage: ({ articles }: { articles: ArticleListItemResp[] }) => (
    <main data-testid="archive-page">
      {articles.map((a) => (
        <span key={a.id}>{a.title}</span>
      ))}
    </main>
  ),
}));

describe("ArchivePageRoute", () => {
  beforeEach(() => {
    mockListPublic.mockReset();
  });

  it("渲染并传入文章数据", async () => {
    mockListPublic.mockResolvedValue(makePage([makeArticle(1), makeArticle(2)]));

    const element = await ArchivePageRoute();
    render(element);

    expect(screen.getByTestId("archive-page")).toBeTruthy();
    expect(screen.getByText("文章 1")).toBeTruthy();
    expect(screen.getByText("文章 2")).toBeTruthy();
    expect(mockListPublic).toHaveBeenCalledWith({
      page: 1,
      page_size: 50,
      sort_by: "created_at",
      sort_order: "desc",
    });
  });

  it("多页时收集全部页并按页序拼接", async () => {
    mockListPublic
      .mockResolvedValueOnce(makePage([makeArticle(1)], { pages: 3, total: 3 }))
      .mockResolvedValueOnce(makePage([makeArticle(2)], { pages: 3, page: 2, total: 3 }))
      .mockResolvedValueOnce(makePage([makeArticle(3)], { pages: 3, page: 3, total: 3 }));

    const element = await ArchivePageRoute();
    render(element);

    expect(mockListPublic).toHaveBeenCalledTimes(3);
    expect(screen.getByText("文章 1")).toBeTruthy();
    expect(screen.getByText("文章 2")).toBeTruthy();
    expect(screen.getByText("文章 3")).toBeTruthy();
  });

  it("API 失败时降级渲染空列表", async () => {
    mockListPublic.mockRejectedValueOnce(new Error("network error"));

    const element = await ArchivePageRoute();
    render(element);

    expect(screen.getByTestId("archive-page")).toBeTruthy();
    expect(screen.queryByText("文章 1")).toBeNull();
  });
});

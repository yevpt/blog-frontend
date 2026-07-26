// @vitest-environment jsdom
import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, it, expect, vi } from "vitest";
import type { ArticlePageResp, TagItemResp } from "@repo/api";
import TagDetailPage, { generateMetadata } from "./page";

const NOT_FOUND_ERROR = "NEXT_HTTP_ERROR_FALLBACK;404";

const mockState = vi.hoisted(() => ({
  listTags: vi.fn(),
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
    tags: { list: mockState.listTags },
    articles: { listPublic: mockState.listPublic },
  })),
}));

vi.mock("@/lib/seo", () => ({
  getCanonicalUrl: (path: string) => new URL(path, "https://example.com"),
}));

vi.mock("@/components/common/page-container", () => ({
  PageContainer: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/tags", () => ({
  TagDetailHeader: ({ tag }: { tag: TagItemResp }) => (
    <header data-testid="tag-detail-header">{tag.name}</header>
  ),
}));

vi.mock("@/components/articles", () => ({
  ArticleSection: ({
    initialPage,
    currentTagId,
  }: {
    initialPage: ArticlePageResp;
    currentTagId?: number;
  }) => (
    <main data-testid="article-section" data-tag-id={currentTagId}>
      {initialPage.list.map((a) => (
        <span key={a.id}>{a.title}</span>
      ))}
    </main>
  ),
}));

const tag: TagItemResp = {
  id: 2,
  name: "React",
  description: "前端框架相关笔记",
  seq: 0,
  article_count: 25,
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

describe("TagDetailPage", () => {
  beforeEach(() => {
    mockState.listTags.mockReset();
    mockState.listPublic.mockReset();
    mockState.notFound.mockClear();
  });

  it("渲染标签头部与受控文章列表", async () => {
    mockState.listTags.mockResolvedValue({ list: [tag] });
    mockState.listPublic.mockResolvedValue(makePage([{ id: 1, title: "标签文章" }]));

    const element = await TagDetailPage(makeParams("2"));
    render(element);

    expect(screen.getByTestId("tag-detail-header").textContent).toBe("React");
    expect(screen.getByTestId("article-section").getAttribute("data-tag-id")).toBe("2");
    expect(screen.getByText("标签文章")).toBeTruthy();
    expect(mockState.listPublic).toHaveBeenCalledWith({ page: 1, tag_id: 2 });
  });

  it("非法 id 触发 notFound", async () => {
    await expect(TagDetailPage(makeParams("abc"))).rejects.toThrow(NOT_FOUND_ERROR);
    expect(mockState.listTags).not.toHaveBeenCalled();
  });

  it("标签不存在时触发 notFound", async () => {
    mockState.listTags.mockResolvedValue({ list: [tag] });

    await expect(TagDetailPage(makeParams("999"))).rejects.toThrow(NOT_FOUND_ERROR);
  });

  it("文章接口失败时降级为空列表", async () => {
    mockState.listTags.mockResolvedValue({ list: [tag] });
    mockState.listPublic.mockRejectedValueOnce(new Error("network error"));

    const element = await TagDetailPage(makeParams("2"));
    render(element);

    expect(screen.getByTestId("article-section")).toBeTruthy();
    expect(screen.queryByText("标签文章")).toBeNull();
  });
});

describe("generateMetadata", () => {
  beforeEach(() => {
    mockState.listTags.mockReset();
  });

  it("返回带 # 前缀的标签名与描述", async () => {
    mockState.listTags.mockResolvedValue({ list: [tag] });

    const metadata = await generateMetadata(makeParams("2"));

    expect(metadata.title).toBe("#React | Yevpt's Blog");
    expect(metadata.description).toBe("前端框架相关笔记");
  });

  it("标签不存在时返回兜底标题", async () => {
    mockState.listTags.mockResolvedValue({ list: [] });

    const metadata = await generateMetadata(makeParams("999"));

    expect(metadata.title).toBe("标签 | Yevpt's Blog");
  });
});

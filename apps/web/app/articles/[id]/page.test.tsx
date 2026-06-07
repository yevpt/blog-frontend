import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import ArticleDetailPage from "./page";
import type { ArticleDetailResp } from "@repo/api";

interface ArticleNavbarSyncProps {
  articleId: number;
  likeCount: number;
  commentCount: number;
  isLiked: boolean;
  readCount: number;
}

interface ArticleFloatActionsProps {
  articleId: number;
  musicUrl?: string;
  musicName?: string;
}

const mockArticleNavbarSync = vi.fn<(props: ArticleNavbarSyncProps) => null>(() => null);
const mockArticleFloatActions = vi.fn<(props: ArticleFloatActionsProps) => null>(() => null);

const mockArticle: ArticleDetailResp = {
  id: 1,
  title: "Rust Web 框架实战",
  content: "## 介绍\n\n正文。\n\n## 实现\n\n代码。",
  user_id: 1,
  status: 1,
  comment_status: 1,
  read_count: 100,
  like_count: 20,
  comment_count: 5,
  is_recommended: false,
  created_at: "2026-06-01T00:00:00Z",
  updated_at: "2026-06-01T00:00:00Z",
};

vi.mock("@/lib/server-api", () => ({
  createServerApiClient: async () => ({
    articles: { getDetail: async () => mockArticle },
  }),
}));

vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NOT_FOUND");
  },
}));

vi.mock("@/components/article-detail", () => ({
  ArticleNavbarSync: (props: ArticleNavbarSyncProps) => mockArticleNavbarSync(props),
  ArticleHero: ({ article }: { article: ArticleDetailResp }) => <h1>{article.title}</h1>,
  ArticleContent: ({ contentHtml }: { contentHtml: string }) => (
    <div data-testid="content" dangerouslySetInnerHTML={{ __html: contentHtml }} />
  ),
  ArticleToc: () => <nav aria-label="文章目录" />,
  ArticleFloatActions: (props: ArticleFloatActionsProps) => {
    mockArticleFloatActions(props);
    return <div data-testid="float-actions" />;
  },
  ArticleComments: () => <section data-testid="comments" />,
}));

describe("ArticleDetailPage", () => {
  it("把当前文章信息传给 ArticleNavbarSync", async () => {
    mockArticleNavbarSync.mockClear();

    const jsx = await ArticleDetailPage({ params: Promise.resolve({ id: "1" }) });
    render(jsx);

    expect(mockArticleNavbarSync).toHaveBeenCalledWith({
      articleId: mockArticle.id,
      likeCount: mockArticle.like_count,
      commentCount: mockArticle.comment_count,
      isLiked: mockArticle.is_liked ?? false,
      readCount: mockArticle.read_count,
    });
  });

  it("渲染文章标题", async () => {
    const jsx = await ArticleDetailPage({ params: Promise.resolve({ id: "1" }) });
    render(jsx);
    expect(screen.getByText("Rust Web 框架实战")).toBeInTheDocument();
  });

  it("渲染正文和评论区", async () => {
    const jsx = await ArticleDetailPage({ params: Promise.resolve({ id: "1" }) });
    render(jsx);
    expect(screen.getByTestId("content")).toBeInTheDocument();
    expect(screen.getByTestId("comments")).toBeInTheDocument();
  });

  it("渲染浮动操作区", async () => {
    mockArticleFloatActions.mockClear();

    const jsx = await ArticleDetailPage({ params: Promise.resolve({ id: "1" }) });
    render(jsx);

    expect(mockArticleFloatActions).toHaveBeenCalledWith({
      articleId: mockArticle.id,
      musicUrl: mockArticle.music?.[0]?.url,
      musicName: mockArticle.music?.[0]?.name,
    });
    expect(screen.getByTestId("float-actions")).toBeInTheDocument();
  });
});

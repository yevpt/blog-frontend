import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import ArticleDetailPage, { generateMetadata } from "./page";
import type { ArticleDetailResp } from "@repo/api";

interface ArticleNavbarSyncProps {
  articleId: number;
  likeCount: number;
  commentCount: number;
  isLiked: boolean;
  readCount: number;
}

interface ArticleMusicSyncProps {
  musicUrl?: string;
  musicName?: string;
  musicArtist?: string;
  musicCoverUrl?: string;
  musicDurationSeconds?: number;
}

const mockArticleNavbarSync = vi.fn<(props: ArticleNavbarSyncProps) => null>(() => null);
const mockArticleMusicSync = vi.fn<(props: ArticleMusicSyncProps) => null>(() => null);
const mockArticleFloatDockSetup = vi.fn<(props: { articleId: number; hasToc?: boolean }) => null>(
  () => null,
);

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
  ArticleMusicSync: (props: ArticleMusicSyncProps) => mockArticleMusicSync(props),
  ArticleMusicHost: () => <div data-testid="music-host" />,
  ArticleHero: ({ article }: { article: ArticleDetailResp }) => <h1>{article.title}</h1>,
  ArticleContent: ({ contentHtml }: { contentHtml: string }) => (
    <div data-testid="content" dangerouslySetInnerHTML={{ __html: contentHtml }} />
  ),
  ArticleToc: () => <nav aria-label="文章目录" />,
  ArticleFloatDockSetup: (props: { articleId: number; hasToc?: boolean }) => {
    mockArticleFloatDockSetup(props);
    return <div data-testid="float-dock-setup" />;
  },
  ArticleComments: () => <section data-testid="comments" />,
}));

describe("ArticleDetailPage", () => {
  it("生成文章 canonical 地址", async () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://example.com/");

    const metadata = await generateMetadata({ params: Promise.resolve({ id: "1" }) });

    expect(metadata).toMatchObject({
      title: "Rust Web 框架实战 | Yevpt's Blog",
      alternates: { canonical: "https://example.com/articles/1" },
    });
    vi.unstubAllEnvs();
  });

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

  it("同步背景音乐并挂载 audio host", async () => {
    mockArticle.music = [
      {
        id: 2,
        name: "春夏秋冬",
        artist_display_name: "GILLE",
        artists: [{ id: 2, name: "GILLE", display_name: "GILLE" }],
        album: {
          id: 2,
          name: "The Best of “I AM GILLE.”~Amazing J-POP Covers~",
          artist: { id: 2, name: "GILLE", display_name: "GILLE" },
          cover_url: "https://example.com/album-cover.jpg",
        },
        album_track_no: 0,
        audio_url: "https://example.com/a.m4a",
        cover_url: "https://example.com/cover.jpg",
        duration: 307,
        is_public: true,
        seq: 0,
      },
    ];
    mockArticleMusicSync.mockClear();

    const jsx = await ArticleDetailPage({ params: Promise.resolve({ id: "1" }) });
    render(jsx);

    expect(mockArticleMusicSync).toHaveBeenCalledWith({
      musicUrl: "https://example.com/a.m4a",
      musicName: "春夏秋冬",
      musicArtist: "GILLE",
      musicCoverUrl: "https://example.com/cover.jpg",
      musicDurationSeconds: 307,
    });
    expect(screen.getByTestId("music-host")).toBeInTheDocument();

    mockArticle.music = undefined;
  });

  it("渲染浮动操作区", async () => {
    mockArticleFloatDockSetup.mockClear();

    const jsx = await ArticleDetailPage({ params: Promise.resolve({ id: "1" }) });
    render(jsx);

    expect(mockArticleFloatDockSetup).toHaveBeenCalledWith({
      articleId: mockArticle.id,
      hasToc: true,
    });
    expect(screen.getByTestId("float-dock-setup")).toBeInTheDocument();
  });
});

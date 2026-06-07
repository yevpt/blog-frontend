import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ArticleFloatActions } from "./article-float-actions";
import { useActiveArticle } from "@/store/use-active-article";

const mockToggleLike = vi.fn();
vi.mock("@/hooks/use-article-engagement", () => ({
  useArticleEngagement: () => ({
    articleId: 1,
    likeCount: 10,
    commentCount: 5,
    isLiked: false,
    isLiking: false,
    toggleLike: mockToggleLike,
  }),
}));
vi.mock("./music-player", () => ({
  MusicPlayer: () => <div data-testid="music-player" />,
}));

// 拦截阅读上报请求，返回代理后的响应格式（proxyPost 已剥离外层包装）
const mockFetch = vi.fn().mockResolvedValue(
  new Response(JSON.stringify({ id: 1, view_count: 101 }), {
    headers: { "Content-Type": "application/json" },
  }),
);
vi.stubGlobal("fetch", mockFetch);

const defaultProps = {
  articleId: 1,
  musicUrl: undefined,
  musicName: undefined,
};

describe("ArticleFloatActions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useActiveArticle.getState().clearArticle();
    useActiveArticle.getState().syncArticle({
      articleId: 1,
      likeCount: 10,
      commentCount: 5,
      isLiked: false,
      readCount: 100,
    });
  });

  it("渲染点赞和回顶按钮", () => {
    render(<ArticleFloatActions {...defaultProps} />);
    expect(screen.getByRole("button", { name: /点赞/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /回到顶部/ })).toBeInTheDocument();
  });

  it("点击点赞时调用共享 toggleLike", async () => {
    render(<ArticleFloatActions {...defaultProps} />);
    await userEvent.click(screen.getByRole("button", { name: /点赞/ }));
    expect(mockToggleLike).toHaveBeenCalledOnce();
  });

  it("渲染 MusicPlayer 子组件", () => {
    render(<ArticleFloatActions {...defaultProps} musicUrl="https://x.com/a.mp3" />);
    expect(screen.getByTestId("music-player")).toBeInTheDocument();
  });

  it("上报阅读后更新 store 中的 readCount", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ id: 1, view_count: 101 }), {
        headers: { "Content-Type": "application/json" },
      }),
    );

    render(<ArticleFloatActions {...defaultProps} />);

    // 等待 fetch 被调用
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/articles/1/view",
        expect.objectContaining({ method: "POST" }),
      );
    });

    // 等待 store 更新
    await waitFor(() => {
      expect(useActiveArticle.getState().readCount).toBe(101);
    });
  });
});

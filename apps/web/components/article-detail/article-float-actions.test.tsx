import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ArticleFloatActions } from "./article-float-actions";

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

// 拦截 fire-and-forget 的阅读上报请求，避免 jsdom 环境下相对 URL 报错
const mockFetch = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
vi.stubGlobal("fetch", mockFetch);

const defaultProps = {
  articleId: 1,
  musicUrl: undefined,
  musicName: undefined,
};

describe("ArticleFloatActions", () => {
  beforeEach(() => vi.clearAllMocks());

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
});

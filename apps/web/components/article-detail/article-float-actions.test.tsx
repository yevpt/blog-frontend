import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ArticleFloatActions } from "./article-float-actions";

const mockOpenLoginModal = vi.fn();
vi.mock("@/store/use-login-modal", () => ({
  useLoginModal: () => ({ open: mockOpenLoginModal }),
}));
vi.mock("@/app/providers/session-provider", () => ({
  useSession: () => ({ userId: null }),
}));
vi.mock("./music-player", () => ({
  MusicPlayer: () => <div data-testid="music-player" />,
}));

// 拦截 fire-and-forget 的阅读上报请求，避免 jsdom 环境下相对 URL 报错
const mockFetch = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
vi.stubGlobal("fetch", mockFetch);

const defaultProps = {
  articleId: 1,
  initialLikeCount: 10,
  initialIsLiked: false,
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

  it("未登录点赞时触发登录 Modal", async () => {
    render(<ArticleFloatActions {...defaultProps} />);
    await userEvent.click(screen.getByRole("button", { name: /点赞/ }));
    expect(mockOpenLoginModal).toHaveBeenCalled();
  });

  it("渲染 MusicPlayer 子组件", () => {
    render(<ArticleFloatActions {...defaultProps} musicUrl="https://x.com/a.mp3" />);
    expect(screen.getByTestId("music-player")).toBeInTheDocument();
  });
});

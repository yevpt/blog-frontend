import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ArticleFloatActions } from "./article-float-actions";
import { useActiveArticle } from "@/store/use-active-article";
import { useArticleMusic } from "@/store/use-article-music";

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

vi.mock("@repo/icons", () => ({
  SvgIcon: ({ name }: { name: string }) => <span data-testid={`icon-${name}`} />,
}));

vi.mock("@repo/ui", () => ({
  cn: (...classes: Array<string | false | null | undefined>) => classes.filter(Boolean).join(" "),
  Button: ({
    children,
    onPress,
    className,
    "aria-label": ariaLabel,
    isDisabled,
  }: {
    children: React.ReactNode;
    onPress?: () => void;
    className?: string;
    "aria-label"?: string;
    isDisabled?: boolean;
  }) => (
    <button
      type="button"
      className={className}
      aria-label={ariaLabel}
      disabled={isDisabled}
      onClick={onPress}
    >
      {children}
    </button>
  ),
}));

const mockFetch = vi.fn().mockResolvedValue(
  new Response(JSON.stringify({ id: 1, view_count: 101 }), {
    headers: { "Content-Type": "application/json" },
  }),
);
vi.stubGlobal("fetch", mockFetch);

describe("ArticleFloatActions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useActiveArticle.getState().clearArticle();
    useArticleMusic.getState().clear();
    useActiveArticle.getState().syncArticle({
      articleId: 1,
      likeCount: 10,
      commentCount: 5,
      isLiked: false,
      readCount: 100,
    });
  });

  it("渲染点赞和回顶按钮", () => {
    render(<ArticleFloatActions articleId={1} />);
    expect(screen.getByRole("button", { name: /点赞/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /点赞/ })).toHaveClass("hidden", "md:flex");
    expect(screen.getByRole("button", { name: /回到顶部/ })).toBeInTheDocument();
  });

  it("点击点赞时调用共享 toggleLike", async () => {
    render(<ArticleFloatActions articleId={1} />);
    await userEvent.click(screen.getByRole("button", { name: /点赞/ }));
    expect(mockToggleLike).toHaveBeenCalledOnce();
  });

  it("有背景音乐时渲染 PC 端全局音乐控制", () => {
    useArticleMusic.getState().init({ url: "https://x.com/a.mp3", name: "雨夜" });

    render(<ArticleFloatActions articleId={1} />);

    expect(screen.getByRole("button", { name: /播放 雨夜/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /播放 雨夜/ }).parentElement).toHaveClass(
      "hidden",
      "md:block",
    );
  });

  it("无背景音乐时不渲染音乐控制", () => {
    render(<ArticleFloatActions articleId={1} />);
    expect(screen.queryByTestId("icon-music")).not.toBeInTheDocument();
  });

  it("上报阅读后更新 store 中的 readCount", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ id: 1, view_count: 101 }), {
        headers: { "Content-Type": "application/json" },
      }),
    );

    render(<ArticleFloatActions articleId={1} />);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/articles/1/view",
        expect.objectContaining({ method: "POST" }),
      );
    });

    await waitFor(() => {
      expect(useActiveArticle.getState().readCount).toBe(101);
    });
  });
});

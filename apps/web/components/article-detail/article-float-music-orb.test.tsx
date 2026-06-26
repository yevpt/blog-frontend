// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { ArticleFloatMusicOrb } from "./article-float-music-orb";
import { useArticleMusic } from "@/store/use-article-music";

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

describe("ArticleFloatMusicOrb", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useArticleMusic.getState().clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("无配乐时不渲染占位", () => {
    const { container } = render(<ArticleFloatMusicOrb />);
    expect(container).toBeEmptyDOMElement();
  });

  it("配乐条不可见时显示浮动音乐钮", () => {
    useArticleMusic.getState().init({ url: "https://x.com/a.mp3", name: "雨夜" });
    useArticleMusic.setState({ isMusicBarInView: false });

    render(<ArticleFloatMusicOrb />);
    expect(screen.getByRole("button", { name: /播放 雨夜/ })).toBeInTheDocument();
  });

  it("配乐条重新进入视口后延迟隐藏，且保留栈内占位", () => {
    useArticleMusic.getState().init({ url: "https://x.com/a.mp3", name: "雨夜" });
    useArticleMusic.setState({ isMusicBarInView: false });

    const { container } = render(<ArticleFloatMusicOrb />);
    expect(screen.getByRole("button", { name: /播放 雨夜/ })).toBeInTheDocument();

    act(() => {
      useArticleMusic.setState({ isMusicBarInView: true });
    });

    expect(screen.getByRole("button", { name: /播放 雨夜/ })).toBeInTheDocument();
    expect(container.firstElementChild).toHaveClass("size-10", "shrink-0");
    expect(container.firstElementChild).not.toHaveClass("opacity-0");

    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(container.firstElementChild).toHaveClass("opacity-0", "pointer-events-none");
    expect(screen.getByRole("button", { name: /播放 雨夜/, hidden: true })).toBeInTheDocument();
  });
});

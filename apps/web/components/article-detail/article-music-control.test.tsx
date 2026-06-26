import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ArticleMusicControl } from "./article-music-control";
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

describe("ArticleMusicControl", () => {
  beforeEach(() => {
    useArticleMusic.getState().clear();
    vi.clearAllMocks();
  });

  it("无曲目时不渲染", () => {
    const { container } = render(<ArticleMusicControl variant="float" />);
    expect(container.firstChild).toBeNull();
  });

  it("float 变体渲染进度环按钮", () => {
    useArticleMusic.getState().init({ url: "https://example.com/a.mp3", name: "雨夜" });

    render(<ArticleMusicControl variant="float" />);

    expect(screen.getByRole("button", { name: /播放 雨夜/ })).toHaveClass("h-10", "w-10");
    expect(screen.getByTestId("icon-music")).toBeInTheDocument();
  });

  it("navbar 变体使用移动端尺寸", () => {
    useArticleMusic.getState().init({ url: "https://example.com/a.mp3", name: "雨夜" });

    render(<ArticleMusicControl variant="navbar" />);

    expect(screen.getByRole("button", { name: /播放 雨夜/ })).toHaveClass("h-8", "w-8");
  });

  it("播放中显示暂停图标", () => {
    useArticleMusic.setState({
      track: { url: "https://example.com/a.mp3", name: "雨夜" },
      playbackState: "playing",
      progress: 0.3,
      audioEl: null,
    });

    render(<ArticleMusicControl variant="float" />);

    expect(screen.getByRole("button", { name: /暂停 雨夜/ })).toBeInTheDocument();
    expect(screen.getByTestId("icon-pause")).toBeInTheDocument();
  });

  it("点击调用 toggle", async () => {
    const toggle = vi.fn();
    useArticleMusic.setState({
      track: { url: "https://example.com/a.mp3", name: "雨夜" },
      playbackState: "idle",
      progress: 0,
      audioEl: null,
      toggle,
    });

    render(<ArticleMusicControl variant="navbar" />);
    await userEvent.click(screen.getByRole("button", { name: /播放 雨夜/ }));

    expect(toggle).toHaveBeenCalledOnce();
  });
});

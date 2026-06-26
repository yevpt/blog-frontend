// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { FloatDockProvider, SiteFloatDock, useFloatDockConfig } from "./index";
import { ARTICLE_FLOAT_DOCK_LAYOUT } from "@/lib/float-dock-layouts";
import { useArticleMusic } from "@/store/use-article-music";

const engagementState = vi.hoisted(() => ({
  isLiked: false,
  isLiking: false,
  likeCount: 10,
}));

const mediaQueryState = vi.hoisted(() => ({
  matches: true,
  listeners: new Set<() => void>(),
}));

vi.mock("@/hooks/use-article-engagement", () => ({
  useArticleEngagement: () => ({
    articleId: 1,
    likeCount: engagementState.likeCount,
    commentCount: 5,
    isLiked: engagementState.isLiked,
    isLiking: engagementState.isLiking,
    toggleLike: vi.fn(),
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
    "aria-pressed": ariaPressed,
    isDisabled,
  }: {
    children: React.ReactNode;
    onPress?: () => void;
    className?: string;
    "aria-label"?: string;
    "aria-pressed"?: boolean;
    isDisabled?: boolean;
  }) => (
    <button
      type="button"
      className={className}
      aria-label={ariaLabel}
      aria-pressed={ariaPressed}
      disabled={isDisabled}
      onClick={onPress}
    >
      {children}
    </button>
  ),
}));

function setMdViewport(matches: boolean) {
  mediaQueryState.matches = matches;
  mediaQueryState.listeners.forEach((listener) => listener());
}

function ArticleDockHarness({ hasToc = false }: { hasToc?: boolean }) {
  useFloatDockConfig({
    position: {
      variant: "page-column",
      layout: ARTICLE_FLOAT_DOCK_LAYOUT,
      hasSidebar: hasToc,
    },
    items: [
      {
        id: "music",
        order: 10,
        render: () => {
          const hasMusic = Boolean(useArticleMusic.getState().track);
          const inView = useArticleMusic.getState().isMusicBarInView;
          if (!hasMusic || inView) return null;
          return (
            <button type="button" aria-label="播放 雨夜">
              music
            </button>
          );
        },
      },
      {
        id: "like",
        order: 20,
        render: () => (
          <button type="button" aria-label={engagementState.isLiked ? "取消点赞" : "点赞"}>
            like
          </button>
        ),
      },
    ],
  });

  return <SiteFloatDock />;
}

function renderDock(ui: React.ReactElement) {
  return render(<FloatDockProvider>{ui}</FloatDockProvider>);
}

describe("SiteFloatDock", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    engagementState.isLiked = false;
    engagementState.isLiking = false;
    engagementState.likeCount = 10;
    mediaQueryState.matches = true;
    mediaQueryState.listeners.clear();

    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      value: 1440,
    });

    window.matchMedia = vi.fn().mockImplementation(() => ({
      get matches() {
        return mediaQueryState.matches;
      },
      media: "(min-width: 768px)",
      addEventListener: (_event: string, listener: () => void) => {
        mediaQueryState.listeners.add(listener);
      },
      removeEventListener: (_event: string, listener: () => void) => {
        mediaQueryState.listeners.delete(listener);
      },
    })) as typeof window.matchMedia;

    useArticleMusic.getState().clear();
  });

  it("PC 视口按页面列对齐水平位置", () => {
    renderDock(<ArticleDockHarness hasToc={false} />);
    const root = screen.getByTestId("float-actions-dock").parentElement;
    expect(root).toHaveStyle({ left: "1180px", bottom: "24px" });
  });

  it("有目录时水平位置在目录右侧留白", () => {
    renderDock(<ArticleDockHarness hasToc />);
    const root = screen.getByTestId("float-actions-dock").parentElement;
    expect(root).toHaveStyle({ left: "1294px" });
  });

  it("PC 视口渲染竖向 Dock", () => {
    renderDock(<ArticleDockHarness />);
    expect(screen.getByTestId("float-actions-dock")).toHaveClass("flex-col", "gap-2");
    expect(screen.getByRole("button", { name: /^点赞$/ })).toBeInTheDocument();
  });

  it("移动端视口不渲染 Dock", () => {
    setMdViewport(false);
    renderDock(<ArticleDockHarness />);
    expect(screen.queryByTestId("float-actions-dock")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /回到顶部/ })).toBeInTheDocument();
  });

  it("移动端回顶钮使用与桌面端一致的毛玻璃样式", () => {
    setMdViewport(false);
    renderDock(<ArticleDockHarness />);
    expect(screen.getByRole("button", { name: /回到顶部/ })).toHaveClass(
      "backdrop-blur-xl",
      "bg-background/65",
    );
  });

  it("配乐条可见时不显示浮动音乐钮", () => {
    useArticleMusic.getState().init({ url: "https://x.com/a.mp3", name: "雨夜" });
    useArticleMusic.setState({ isMusicBarInView: true });

    renderDock(<ArticleDockHarness />);
    expect(screen.queryByRole("button", { name: /播放 雨夜/ })).not.toBeInTheDocument();
  });

  it("配乐条不可见时显示浮动音乐钮", () => {
    useArticleMusic.getState().init({ url: "https://x.com/a.mp3", name: "雨夜" });
    useArticleMusic.setState({ isMusicBarInView: false });

    renderDock(<ArticleDockHarness />);
    expect(screen.getByRole("button", { name: /播放 雨夜/ })).toBeInTheDocument();
  });

  it("滚动超过阈值后显示回顶钮", () => {
    renderDock(<ArticleDockHarness />);
    Object.defineProperty(window, "innerHeight", {
      value: 900,
      writable: true,
      configurable: true,
    });
    Object.defineProperty(window, "scrollY", { value: 1400, writable: true, configurable: true });
    fireEvent.scroll(window);
    expect(screen.getByRole("button", { name: /回到顶部/ })).not.toHaveClass("opacity-0");
  });
});

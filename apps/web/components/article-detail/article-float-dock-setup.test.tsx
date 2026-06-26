// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { FloatDockProvider, SiteFloatDock } from "@/components/float-dock";
import { ArticleFloatDockSetup } from "./article-float-dock-setup";

const mediaQueryState = vi.hoisted(() => ({
  matches: true,
  listeners: new Set<() => void>(),
}));

const engagementState = vi.hoisted(() => ({
  isLiked: false,
  isLiking: false,
  likeCount: 10,
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

vi.mock("@/store/use-active-article", () => ({
  useActiveArticle: (selector: (state: { patchViewCount: () => void }) => unknown) =>
    selector({ patchViewCount: vi.fn() }),
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

describe("ArticleFloatDockSetup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    engagementState.isLiked = false;
    engagementState.isLiking = false;
    mediaQueryState.matches = true;
    mediaQueryState.listeners.clear();

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ view_count: 100 }),
    }) as typeof fetch;

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
  });

  it("桌面端注册浮动点赞钮", () => {
    render(
      <FloatDockProvider>
        <ArticleFloatDockSetup articleId={1} />
        <SiteFloatDock />
      </FloatDockProvider>,
    );

    expect(screen.getByRole("button", { name: /^点赞$/ })).toBeInTheDocument();
  });

  it("移动端不注册浮动点赞钮", () => {
    setMdViewport(false);

    render(
      <FloatDockProvider>
        <ArticleFloatDockSetup articleId={1} />
        <SiteFloatDock />
      </FloatDockProvider>,
    );

    expect(screen.queryByRole("button", { name: /^点赞$/ })).not.toBeInTheDocument();
  });
});

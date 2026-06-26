// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ArticleFloatLikeOrb } from "./article-float-like-orb";

const mockToggleLike = vi.fn().mockResolvedValue(undefined);

vi.mock("@/hooks/use-article-engagement", () => ({
  useArticleEngagement: () => ({
    likeCount: 10,
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

describe("ArticleFloatLikeOrb", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("点击点赞调用 toggleLike", async () => {
    render(<ArticleFloatLikeOrb />);
    await userEvent.click(screen.getByRole("button", { name: /^点赞$/ }));
    expect(mockToggleLike).toHaveBeenCalledOnce();
  });
});

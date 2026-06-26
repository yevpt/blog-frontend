import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NavbarMobileHeader } from "./navbar-mobile-header";

const mockPush = vi.fn();
const mockToggleMenu = vi.fn();
const mockToggleLike = vi.fn();
const mockScrollIntoView = vi.fn();
const mockUseArticleEngagement = vi.fn();

const defaultArticleEngagementState = {
  articleId: 1,
  likeCount: 120,
  commentCount: 8,
  isLiked: true,
  isLiking: false,
  toggleLike: mockToggleLike,
};

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("@repo/icons", () => ({
  SvgIcon: ({ name }: { name: string }) => <span data-testid={`icon-${name}`} />,
}));

vi.mock("@/hooks/use-article-engagement", () => ({
  useArticleEngagement: () => mockUseArticleEngagement(),
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

describe("NavbarMobileHeader", () => {
  beforeEach(() => {
    mockPush.mockReset();
    mockToggleMenu.mockReset();
    mockToggleLike.mockReset();
    mockScrollIntoView.mockReset();
    mockUseArticleEngagement.mockReset();
    mockUseArticleEngagement.mockReturnValue(defaultArticleEngagementState);
    document.body.innerHTML = "";
  });

  it("home 变体渲染菜单按钮，不渲染返回按钮", () => {
    render(
      <NavbarMobileHeader
        mobileVariant="home"
        title={undefined}
        isGlass={false}
        menuOpen={false}
        onToggleMenu={mockToggleMenu}
      />,
    );

    expect(screen.getByLabelText("打开导航菜单")).toBeInTheDocument();
    expect(screen.queryByLabelText("返回首页")).not.toBeInTheDocument();
  });

  it("unreadCount 大于 0 时菜单按钮显示红点", () => {
    render(
      <NavbarMobileHeader
        mobileVariant="home"
        title={undefined}
        isGlass={false}
        menuOpen={false}
        onToggleMenu={mockToggleMenu}
        unreadCount={2}
      />,
    );

    expect(screen.getByTestId("mobile-menu-unread-dot")).toBeInTheDocument();
  });

  it("unreadCount 为 0 时菜单按钮不显示红点", () => {
    render(
      <NavbarMobileHeader
        mobileVariant="home"
        title={undefined}
        isGlass={false}
        menuOpen={false}
        onToggleMenu={mockToggleMenu}
        unreadCount={0}
      />,
    );

    expect(screen.queryByTestId("mobile-menu-unread-dot")).not.toBeInTheDocument();
  });

  it("非 article 变体不调用文章互动 hook", () => {
    render(
      <NavbarMobileHeader
        mobileVariant="home"
        title={undefined}
        isGlass={false}
        menuOpen={false}
        onToggleMenu={mockToggleMenu}
      />,
    );

    render(
      <NavbarMobileHeader
        mobileVariant="default"
        title="碎语"
        isGlass={true}
        menuOpen={false}
        onToggleMenu={mockToggleMenu}
      />,
    );

    expect(mockUseArticleEngagement).not.toHaveBeenCalled();
  });

  it("article 变体渲染返回首页、点赞数字按钮、评论数字按钮、menu", () => {
    render(
      <NavbarMobileHeader
        mobileVariant="article"
        title={undefined}
        isGlass={true}
        menuOpen={false}
        onToggleMenu={mockToggleMenu}
      />,
    );

    expect(screen.getByLabelText("返回首页")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "点赞 99+" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "评论 8" })).toBeInTheDocument();
    expect(screen.getByLabelText("打开导航菜单")).toBeInTheDocument();
  });

  it("default 变体渲染返回首页、标题、menu", () => {
    render(
      <NavbarMobileHeader
        mobileVariant="default"
        title="碎语"
        isGlass={true}
        menuOpen={false}
        onToggleMenu={mockToggleMenu}
      />,
    );

    expect(screen.getByLabelText("返回首页")).toBeInTheDocument();
    expect(screen.getByText("碎语")).toBeInTheDocument();
    expect(screen.getByLabelText("打开导航菜单")).toBeInTheDocument();
  });

  it("点击返回首页调用 router.push('/')", async () => {
    const user = userEvent.setup();
    render(
      <NavbarMobileHeader
        mobileVariant="default"
        title="留言"
        isGlass={true}
        menuOpen={false}
        onToggleMenu={mockToggleMenu}
      />,
    );

    await user.click(screen.getByLabelText("返回首页"));
    expect(mockPush).toHaveBeenCalledWith("/");
  });

  it("点击菜单按钮调用 onToggleMenu", async () => {
    const user = userEvent.setup();
    render(
      <NavbarMobileHeader
        mobileVariant="default"
        title="留言"
        isGlass={true}
        menuOpen={false}
        onToggleMenu={mockToggleMenu}
      />,
    );

    await user.click(screen.getByLabelText("打开导航菜单"));
    expect(mockToggleMenu).toHaveBeenCalledOnce();
  });

  it("menuOpen=true 时菜单按钮 aria-label 为关闭导航菜单", () => {
    render(
      <NavbarMobileHeader
        mobileVariant="default"
        title="留言"
        isGlass={true}
        menuOpen={true}
        onToggleMenu={mockToggleMenu}
      />,
    );

    expect(screen.getByLabelText("关闭导航菜单")).toBeInTheDocument();
    expect(screen.queryByLabelText("打开导航菜单")).not.toBeInTheDocument();
  });

  it("article 变体有背景音乐时不渲染顶部音乐控制", () => {
    render(
      <NavbarMobileHeader
        mobileVariant="article"
        title={undefined}
        isGlass={true}
        menuOpen={false}
        onToggleMenu={mockToggleMenu}
      />,
    );

    expect(screen.queryByRole("button", { name: /播放/ })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "点赞 99+" })).toBeInTheDocument();
  });

  it("article 变体点击点赞按钮时调用 toggleLike", async () => {
    const user = userEvent.setup();
    render(
      <NavbarMobileHeader
        mobileVariant="article"
        title={undefined}
        isGlass={true}
        menuOpen={false}
        onToggleMenu={mockToggleMenu}
      />,
    );

    await user.click(screen.getByRole("button", { name: "点赞 99+" }));
    expect(mockToggleLike).toHaveBeenCalledOnce();
  });

  it("article 变体在 isLiking=true 时禁用点赞按钮", () => {
    mockUseArticleEngagement.mockReturnValue({
      ...defaultArticleEngagementState,
      isLiking: true,
    });

    render(
      <NavbarMobileHeader
        mobileVariant="article"
        title={undefined}
        isGlass={true}
        menuOpen={false}
        onToggleMenu={mockToggleMenu}
      />,
    );

    expect(screen.getByRole("button", { name: "点赞 99+" })).toBeDisabled();
  });

  it("article 变体点击评论按钮时滚动到评论区锚点", async () => {
    const user = userEvent.setup();
    const anchor = document.createElement("section");
    anchor.id = "article-comments";
    anchor.scrollIntoView = mockScrollIntoView;
    document.body.appendChild(anchor);

    render(
      <NavbarMobileHeader
        mobileVariant="article"
        title={undefined}
        isGlass={true}
        menuOpen={false}
        onToggleMenu={mockToggleMenu}
      />,
    );

    await user.click(screen.getByRole("button", { name: "评论 8" }));
    expect(mockScrollIntoView).toHaveBeenCalledWith({
      behavior: "smooth",
      block: "start",
    });
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NavbarMobileHeader } from "./navbar-mobile-header";

const mockPush = vi.fn();
const mockToggleMenu = vi.fn();
const mockToggleLike = vi.fn();
const mockScrollIntoView = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("@repo/icons", () => ({
  SvgIcon: ({ name }: { name: string }) => <span data-testid={`icon-${name}`} />,
}));

vi.mock("@/hooks/use-article-engagement", () => ({
  useArticleEngagement: () => ({
    articleId: 1,
    likeCount: 120,
    commentCount: 8,
    isLiked: true,
    isLiking: false,
    toggleLike: mockToggleLike,
  }),
}));

describe("NavbarMobileHeader", () => {
  beforeEach(() => {
    mockPush.mockReset();
    mockToggleMenu.mockReset();
    mockToggleLike.mockReset();
    mockScrollIntoView.mockReset();
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

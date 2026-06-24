// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { UserLikedContentPageResp, UserLikedContentItemResp } from "@repo/api";
import { ProfileLikesTab } from "./profile-likes-tab";

const { mockUseUserLikedContent } = vi.hoisted(() => ({
  mockUseUserLikedContent: vi.fn(),
}));

vi.mock("@/hooks/use-user-liked-content", () => ({
  useUserLikedContent: mockUseUserLikedContent,
}));

vi.mock("./profile-likes-virtual-list", () => ({
  ProfileLikesVirtualList: ({ items }: { items: UserLikedContentItemResp[] }) => (
    <div data-testid="profile-likes-virtual-list">{items.length} 条</div>
  ),
}));

vi.mock("@repo/icons", () => ({
  SvgIcon: ({ name }: { name: string }) => <span data-testid={`icon-${name}`} />,
}));

vi.mock("@repo/ui", () => ({
  cn: (...classes: Array<string | false | null | undefined>) => classes.filter(Boolean).join(" "),
  Button: ({
    children,
    onPress,
    ...props
  }: {
    children: React.ReactNode;
    onPress?: () => void;
    [key: string]: unknown;
  }) => (
    <button type="button" onClick={onPress} {...props}>
      {children}
    </button>
  ),
}));

const baseItem: UserLikedContentItemResp = {
  id: 1,
  liked_at: "2026-06-01T10:00:00Z",
  kind: "article",
  filter: "article",
  content: { id: 10, excerpt: "摘要", title: "标题" },
};

function makeHookState(overrides: Record<string, unknown> = {}) {
  return {
    filter: "all",
    items: [] as UserLikedContentItemResp[],
    pageData: {
      total: 0,
      pages: 0,
      page: 1,
      page_size: 20,
      list: [],
    } satisfies UserLikedContentPageResp,
    isLoadingInitial: false,
    isLoadingMore: false,
    endReached: true,
    initialError: false,
    fetchError: false,
    changeFilter: vi.fn(),
    loadMore: vi.fn(),
    retryInitial: vi.fn(),
    retryLoadMore: vi.fn(),
    ...overrides,
  };
}

describe("ProfileLikesTab", () => {
  beforeEach(() => {
    mockUseUserLikedContent.mockReturnValue(makeHookState());
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("首屏加载时展示骨架屏", () => {
    mockUseUserLikedContent.mockReturnValue(makeHookState({ isLoadingInitial: true }));

    render(<ProfileLikesTab userId={1} isOwner={false} likesCount={3} />);

    expect(screen.getByTestId("profile-likes-skeleton")).toBeInTheDocument();
  });

  it("空列表展示空态", () => {
    render(<ProfileLikesTab userId={1} isOwner likesCount={0} />);

    expect(screen.getByText("暂无点赞")).toBeInTheDocument();
    expect(screen.getByText("你还没有点赞过任何内容")).toBeInTheDocument();
    expect(screen.queryByRole("tablist", { name: "点赞内容筛选" })).not.toBeInTheDocument();
  });

  it("首屏失败展示重试", async () => {
    const retryInitial = vi.fn();
    mockUseUserLikedContent.mockReturnValue(makeHookState({ initialError: true, retryInitial }));

    render(<ProfileLikesTab userId={1} isOwner={false} likesCount={2} />);

    expect(screen.getByText("加载失败，请稍后重试")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /重试/ }));
    expect(retryInitial).toHaveBeenCalled();
  });

  it("有数据时渲染虚拟列表", () => {
    mockUseUserLikedContent.mockReturnValue(
      makeHookState({ items: [baseItem], endReached: false }),
    );

    render(<ProfileLikesTab userId={1} isOwner={false} likesCount={1} />);

    expect(screen.getByTestId("profile-likes-virtual-list")).toHaveTextContent("1 条");
  });

  it("切换筛选调用 changeFilter", async () => {
    const changeFilter = vi.fn();
    mockUseUserLikedContent.mockReturnValue(makeHookState({ changeFilter }));

    render(<ProfileLikesTab userId={1} isOwner={false} likesCount={5} />);

    await userEvent.click(screen.getByRole("tab", { name: "文章" }));

    await waitFor(() => {
      expect(changeFilter).toHaveBeenCalledWith("article");
    });
  });

  it("当前筛选项使用实心 pill，其余为描边", () => {
    mockUseUserLikedContent.mockReturnValue(makeHookState({ filter: "all" }));

    render(<ProfileLikesTab userId={1} isOwner={false} likesCount={5} />);

    const allTab = screen.getByRole("tab", { name: "全部" });
    const articleTab = screen.getByRole("tab", { name: "文章" });

    expect(allTab.className).toContain("bg-muted");
    expect(articleTab.className).toContain("border-border");
    expect(articleTab.className).toContain("bg-transparent");
  });
});

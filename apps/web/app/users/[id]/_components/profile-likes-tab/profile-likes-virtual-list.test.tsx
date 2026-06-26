import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import type { UserLikedContentItemResp } from "@repo/api";
import { ProfileLikesVirtualList } from "./profile-likes-virtual-list";

const endReached = vi.fn();

vi.mock("react-virtuoso", () => ({
  Virtuoso: ({
    data,
    itemContent,
    endReached: onEndReached,
    components,
  }: {
    data: UserLikedContentItemResp[];
    itemContent: (index: number, item: UserLikedContentItemResp) => ReactNode;
    endReached?: () => void;
    components?: { Footer?: () => ReactNode };
  }) => {
    endReached.mockImplementation(() => onEndReached?.());
    return (
      <div data-testid="virtuoso">
        {data.map((item, index) => (
          <div key={item.id}>{itemContent(index, item)}</div>
        ))}
        {components?.Footer ? <components.Footer /> : null}
      </div>
    );
  },
}));

vi.mock("./liked-content-card", () => ({
  LikedContentCard: ({ item }: { item: UserLikedContentItemResp }) => (
    <article data-testid="liked-card">{item.id}</article>
  ),
}));

vi.mock("@/components/moments/moment-scroll-loader", () => ({
  MomentScrollLoader: () => <div data-testid="scroll-loader">loading</div>,
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

function makeItem(id: number): UserLikedContentItemResp {
  return {
    id,
    liked_at: "2026-06-01T10:00:00Z",
    kind: "article",
    filter: "article",
    content: { id: id * 10, excerpt: "摘要", title: `标题 ${id}` },
  };
}

const baseProps = {
  fetchError: false,
  showEndMessage: false,
  onLoadMore: vi.fn(),
  onRetryLoadMore: vi.fn(),
};

describe("ProfileLikesVirtualList", () => {
  it("渲染虚拟列表项", () => {
    render(
      <ProfileLikesVirtualList
        {...baseProps}
        items={[makeItem(1), makeItem(2)]}
        hasMore
        loading={false}
      />,
    );

    expect(screen.getByTestId("virtuoso")).toBeInTheDocument();
    expect(screen.getAllByTestId("liked-card")).toHaveLength(2);
  });

  it("滚动到底时触发 onLoadMore", () => {
    const onLoadMore = vi.fn();
    render(
      <ProfileLikesVirtualList
        {...baseProps}
        items={[makeItem(1)]}
        hasMore
        loading={false}
        onLoadMore={onLoadMore}
      />,
    );

    endReached();
    expect(onLoadMore).toHaveBeenCalledTimes(1);
  });

  it("加载中时不触发 onLoadMore，Footer 展示加载态", () => {
    const onLoadMore = vi.fn();
    render(
      <ProfileLikesVirtualList
        {...baseProps}
        items={[makeItem(1)]}
        hasMore
        loading
        onLoadMore={onLoadMore}
      />,
    );

    endReached();
    expect(onLoadMore).not.toHaveBeenCalled();
    expect(screen.getByTestId("scroll-loader")).toBeInTheDocument();
  });

  it("showEndMessage 为 true 时展示轻量到底提示", () => {
    render(
      <ProfileLikesVirtualList
        {...baseProps}
        items={[makeItem(1)]}
        hasMore={false}
        loading={false}
        showEndMessage
      />,
    );

    expect(screen.getByTestId("profile-likes-end-hint")).toHaveTextContent("已经到底了");
  });

  it("无到底提示且列表已结束时，最后一条不显示底部分割线", () => {
    render(
      <ProfileLikesVirtualList
        {...baseProps}
        items={[makeItem(1), makeItem(2)]}
        hasMore={false}
        loading={false}
        showEndMessage={false}
      />,
    );

    const items = screen.getAllByTestId("profile-liked-item");
    expect(items[0]?.className.split(/\s+/)).toContain("border-b");
    expect(items[1]?.className.split(/\s+/)).not.toContain("border-b");
  });

  it("加载更多失败时 Footer 展示重试", async () => {
    const onRetryLoadMore = vi.fn();
    render(
      <ProfileLikesVirtualList
        {...baseProps}
        items={[makeItem(1)]}
        hasMore
        loading={false}
        fetchError
        onRetryLoadMore={onRetryLoadMore}
      />,
    );

    expect(screen.getByText("加载失败，请稍后重试")).toBeInTheDocument();
    await screen.getByRole("button", { name: /重试/ }).click();
    expect(onRetryLoadMore).toHaveBeenCalled();
  });
});

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import type { MomentItemResp } from "@repo/api";
import { ProfileMomentsVirtualList } from "./profile-moments-virtual-list";

const endReached = vi.fn();

vi.mock("react-virtuoso", () => ({
  Virtuoso: ({
    data,
    itemContent,
    endReached: onEndReached,
    components,
  }: {
    data: MomentItemResp[];
    itemContent: (index: number, item: MomentItemResp) => ReactNode;
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

vi.mock("@/components/snippets/snippet-card", () => ({
  SnippetCard: ({ snippet }: { snippet: MomentItemResp }) => (
    <article data-testid="snippet-card" className="last:border-b-0">
      {snippet.content}
    </article>
  ),
}));

vi.mock("@/components/snippets/snippet-scroll-loader", () => ({
  SnippetScrollLoader: () => <div data-testid="scroll-loader">loading</div>,
  SnippetEndReached: () => <div data-testid="end-reached">end</div>,
}));

function makeMoment(id: number): MomentItemResp {
  return {
    id,
    user_id: 1,
    content: `碎语 ${id}`,
    status: 1,
    comment_status: 1,
    read_count: 0,
    is_top: false,
    like_count: 1,
    comment_count: 0,
    is_liked: false,
    images: [],
    created_at: "2026-05-30T09:00:00Z",
    updated_at: "2026-05-30T09:00:00Z",
  };
}

const noop = vi.fn();

describe("ProfileMomentsVirtualList", () => {
  it("渲染虚拟列表项", () => {
    render(
      <ProfileMomentsVirtualList
        items={[makeMoment(1), makeMoment(2)]}
        hasMore
        loading={false}
        fetchError={false}
        pendingLikeIds={new Set()}
        pendingActionIds={new Set()}
        onLoadMore={noop}
        onLike={noop}
        onComment={noop}
        onEdit={noop}
        onToggleTop={noop}
        onDelete={noop}
      />,
    );

    expect(screen.getByTestId("virtuoso")).toBeInTheDocument();
    expect(screen.getAllByTestId("snippet-card")).toHaveLength(2);
    expect(screen.getAllByTestId("profile-moment-item")).toHaveLength(2);
  });

  it("滚动到底时触发 onLoadMore", () => {
    const onLoadMore = vi.fn();
    render(
      <ProfileMomentsVirtualList
        items={[makeMoment(1)]}
        hasMore
        loading={false}
        fetchError={false}
        pendingLikeIds={new Set()}
        pendingActionIds={new Set()}
        onLoadMore={onLoadMore}
        onLike={noop}
        onComment={noop}
        onEdit={noop}
        onToggleTop={noop}
        onDelete={noop}
      />,
    );

    endReached();
    expect(onLoadMore).toHaveBeenCalledTimes(1);
  });

  it("加载中或已无更多时不触发 onLoadMore", () => {
    const onLoadMore = vi.fn();
    const { rerender } = render(
      <ProfileMomentsVirtualList
        items={[makeMoment(1)]}
        hasMore
        loading
        fetchError={false}
        pendingLikeIds={new Set()}
        pendingActionIds={new Set()}
        onLoadMore={onLoadMore}
        onLike={noop}
        onComment={noop}
        onEdit={noop}
        onToggleTop={noop}
        onDelete={noop}
      />,
    );

    endReached();
    expect(onLoadMore).not.toHaveBeenCalled();
    expect(screen.getByTestId("scroll-loader")).toBeInTheDocument();

    rerender(
      <ProfileMomentsVirtualList
        items={[makeMoment(1)]}
        hasMore={false}
        loading={false}
        fetchError={false}
        pendingLikeIds={new Set()}
        pendingActionIds={new Set()}
        onLoadMore={onLoadMore}
        onLike={noop}
        onComment={noop}
        onEdit={noop}
        onToggleTop={noop}
        onDelete={noop}
      />,
    );

    endReached();
    expect(onLoadMore).not.toHaveBeenCalled();
    expect(screen.getByTestId("end-reached")).toBeInTheDocument();
  });

  it("每项外层保留分割线（Virtuoso 下不受 last:border-b-0 影响）", () => {
    render(
      <ProfileMomentsVirtualList
        items={[makeMoment(1), makeMoment(2)]}
        hasMore
        loading={false}
        fetchError={false}
        pendingLikeIds={new Set()}
        pendingActionIds={new Set()}
        onLoadMore={noop}
        onLike={noop}
        onComment={noop}
        onEdit={noop}
        onToggleTop={noop}
        onDelete={noop}
      />,
    );

    for (const item of screen.getAllByTestId("profile-moment-item")) {
      expect(item.className).toContain("border-b");
    }
  });

  it("加载失败时显示错误提示", () => {
    render(
      <ProfileMomentsVirtualList
        items={[makeMoment(1)]}
        hasMore={false}
        loading={false}
        fetchError
        pendingLikeIds={new Set()}
        pendingActionIds={new Set()}
        onLoadMore={noop}
        onLike={noop}
        onComment={noop}
        onEdit={noop}
        onToggleTop={noop}
        onDelete={noop}
      />,
    );

    expect(screen.getByText("加载失败，请稍后重试")).toBeInTheDocument();
  });
});

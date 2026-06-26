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

vi.mock("@/components/moments/moment-card", () => ({
  MomentCard: ({ moment }: { moment: MomentItemResp }) => (
    <article data-testid="moment-card" className="last:border-b-0">
      {moment.content}
    </article>
  ),
}));

vi.mock("@/components/moments/moment-scroll-loader", () => ({
  MomentScrollLoader: () => <div data-testid="scroll-loader">loading</div>,
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

const baseProps = {
  fetchError: false,
  showEndMessage: false,
  pendingLikeIds: new Set<number>(),
  pendingActionIds: new Set<number>(),
  onLoadMore: vi.fn(),
  onLike: vi.fn(),
  onComment: vi.fn(),
  onEdit: vi.fn(),
  onToggleTop: vi.fn(),
  onDelete: vi.fn(),
};

describe("ProfileMomentsVirtualList", () => {
  it("渲染虚拟列表项", () => {
    render(
      <ProfileMomentsVirtualList
        {...baseProps}
        items={[makeMoment(1), makeMoment(2)]}
        hasMore
        loading={false}
      />,
    );

    expect(screen.getByTestId("virtuoso")).toBeInTheDocument();
    expect(screen.getAllByTestId("moment-card")).toHaveLength(2);
    expect(screen.getAllByTestId("profile-moment-item")).toHaveLength(2);
  });

  it("滚动到底时触发 onLoadMore", () => {
    const onLoadMore = vi.fn();
    render(
      <ProfileMomentsVirtualList
        {...baseProps}
        items={[makeMoment(1)]}
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
      <ProfileMomentsVirtualList
        {...baseProps}
        items={[makeMoment(1)]}
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
      <ProfileMomentsVirtualList
        {...baseProps}
        items={[makeMoment(1)]}
        hasMore={false}
        loading={false}
        showEndMessage
      />,
    );

    expect(screen.getByTestId("profile-moments-end-hint")).toHaveTextContent("已经到底了");
  });

  it("showEndMessage 为 false 时不展示到底提示", () => {
    render(
      <ProfileMomentsVirtualList
        {...baseProps}
        items={[makeMoment(1)]}
        hasMore={false}
        loading={false}
        showEndMessage={false}
      />,
    );

    expect(screen.queryByTestId("profile-moments-end-hint")).not.toBeInTheDocument();
  });

  it("无到底提示且列表已结束时，最后一条不显示底部分割线", () => {
    render(
      <ProfileMomentsVirtualList
        {...baseProps}
        items={[makeMoment(1), makeMoment(2)]}
        hasMore={false}
        loading={false}
        showEndMessage={false}
      />,
    );

    const items = screen.getAllByTestId("profile-moment-item");
    expect(items[0]?.className.split(/\s+/)).toContain("border-b");
    expect(items[1]?.className.split(/\s+/)).not.toContain("border-b");
  });

  it("有到底提示时，最后一条仍保留底部分割线", () => {
    render(
      <ProfileMomentsVirtualList
        {...baseProps}
        items={[makeMoment(1), makeMoment(2)]}
        hasMore={false}
        loading={false}
        showEndMessage
      />,
    );

    for (const item of screen.getAllByTestId("profile-moment-item")) {
      expect(item.className.split(/\s+/)).toContain("border-b");
    }
  });

  it("还有更多时，最后一条保留底部分割线", () => {
    render(
      <ProfileMomentsVirtualList
        {...baseProps}
        items={[makeMoment(1), makeMoment(2)]}
        hasMore
        loading={false}
      />,
    );

    for (const item of screen.getAllByTestId("profile-moment-item")) {
      expect(item.className.split(/\s+/)).toContain("border-b");
    }
  });

  it("加载失败时显示错误提示", () => {
    render(
      <ProfileMomentsVirtualList
        {...baseProps}
        items={[makeMoment(1)]}
        hasMore={false}
        loading={false}
        fetchError
      />,
    );

    expect(screen.getByText("加载失败，请稍后重试")).toBeInTheDocument();
  });
});

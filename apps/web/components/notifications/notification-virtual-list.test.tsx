import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import type { NotificationItemResp } from "@repo/api";
import { NotificationVirtualList } from "./notification-virtual-list";

const endReached = vi.fn();

vi.mock("react-virtuoso", () => ({
  Virtuoso: ({
    data,
    itemContent,
    endReached: onEndReached,
    components,
  }: {
    data: NotificationItemResp[];
    itemContent: (index: number, item: NotificationItemResp) => ReactNode;
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

vi.mock("@/components/moments/moment-scroll-loader", () => ({
  MomentScrollLoader: () => <div data-testid="scroll-loader">loading</div>,
  MomentEndReached: () => <div data-testid="end-reached">end</div>,
}));

vi.mock("./notification-card", () => ({
  default: ({ item }: { item: NotificationItemResp }) => <div data-testid="card">{item.id}</div>,
}));

vi.mock("./notification-card-motion", () => ({
  NotificationCardMotion: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

function item(id: number): NotificationItemResp {
  return {
    id,
    event_id: id,
    type: "comment_created",
    title: "t",
    content_excerpt: "",
    is_read: false,
    created_at: "",
    source_type: "comment",
    source_id: 1,
    root_type: "article",
    root_id: 1,
    source_deleted: false,
    root_deleted: false,
  };
}

const noop = vi.fn();

describe("NotificationVirtualList", () => {
  it("渲染虚拟列表项", () => {
    render(
      <NotificationVirtualList
        items={[item(1), item(2)]}
        enteringIds={new Set()}
        staggerAnimateIds={new Set()}
        selecting={false}
        selected={new Set()}
        hasMore
        loading={false}
        onLoadMore={noop}
        onOpen={noop}
        onRead={noop}
        onToggleSelect={noop}
        onInlineLike={noop}
        onInlineReplySubmit={async () => true}
        replyingId={null}
      />,
    );
    expect(screen.getByTestId("virtuoso")).toBeInTheDocument();
    expect(screen.getAllByTestId("card")).toHaveLength(2);
  });

  it("滚动到底时触发 onLoadMore", () => {
    const onLoadMore = vi.fn();
    render(
      <NotificationVirtualList
        items={[item(1)]}
        enteringIds={new Set()}
        staggerAnimateIds={new Set()}
        selecting={false}
        selected={new Set()}
        hasMore
        loading={false}
        onLoadMore={onLoadMore}
        onOpen={noop}
        onRead={noop}
        onToggleSelect={noop}
        onInlineLike={noop}
        onInlineReplySubmit={async () => true}
        replyingId={null}
      />,
    );
    endReached();
    expect(onLoadMore).toHaveBeenCalledTimes(1);
  });

  it("加载中或已无更多时不触发 onLoadMore", () => {
    const onLoadMore = vi.fn();
    const { rerender } = render(
      <NotificationVirtualList
        items={[item(1)]}
        enteringIds={new Set()}
        staggerAnimateIds={new Set()}
        selecting={false}
        selected={new Set()}
        hasMore
        loading
        onLoadMore={onLoadMore}
        onOpen={noop}
        onRead={noop}
        onToggleSelect={noop}
        onInlineLike={noop}
        onInlineReplySubmit={async () => true}
        replyingId={null}
      />,
    );
    endReached();
    expect(onLoadMore).not.toHaveBeenCalled();
    expect(screen.getByTestId("scroll-loader")).toBeInTheDocument();

    rerender(
      <NotificationVirtualList
        items={[item(1)]}
        enteringIds={new Set()}
        staggerAnimateIds={new Set()}
        selecting={false}
        selected={new Set()}
        hasMore={false}
        loading={false}
        onLoadMore={onLoadMore}
        onOpen={noop}
        onRead={noop}
        onToggleSelect={noop}
        onInlineLike={noop}
        onInlineReplySubmit={async () => true}
        replyingId={null}
      />,
    );
    endReached();
    expect(onLoadMore).not.toHaveBeenCalled();
    expect(screen.getByTestId("end-reached")).toBeInTheDocument();
  });
});

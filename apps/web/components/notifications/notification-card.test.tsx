import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { NotificationItemResp } from "@repo/api";
import NotificationCard from "./notification-card";

vi.mock("@repo/icons", () => ({
  SvgIcon: ({ name }: { name: string }) => <span data-icon={name} />,
}));
vi.mock("@repo/ui", () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Button: ({ children, onPress, ...p }: any) => (
    <button onClick={onPress} {...p}>
      {children}
    </button>
  ),
  cn: (...a: unknown[]) => a.filter(Boolean).join(" "),
}));

function item(over: Partial<NotificationItemResp> = {}): NotificationItemResp {
  return {
    id: 1,
    event_id: 1,
    type: "comment",
    title: "有人回复了你",
    content_excerpt: "正文",
    is_read: false,
    created_at: "2026-06-23T10:00:00Z",
    source_type: "",
    source_id: 0,
    root_type: "article",
    root_id: 5,
    ...over,
  };
}

describe("NotificationCard", () => {
  it("未读显示标记已读按钮，点击触发 onRead", () => {
    const onRead = vi.fn();
    render(
      <NotificationCard
        item={item()}
        selecting={false}
        selected={false}
        onOpen={vi.fn()}
        onRead={onRead}
        onRemove={vi.fn()}
        onToggleSelect={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByLabelText("标记已读"));
    expect(onRead).toHaveBeenCalledWith(1);
  });

  it("已读不显示标记已读按钮", () => {
    render(
      <NotificationCard
        item={item({ is_read: true })}
        selecting={false}
        selected={false}
        onOpen={vi.fn()}
        onRead={vi.fn()}
        onRemove={vi.fn()}
        onToggleSelect={vi.fn()}
      />,
    );
    expect(screen.queryByLabelText("标记已读")).toBeNull();
  });

  it("点击卡片主体触发 onOpen", () => {
    const onOpen = vi.fn();
    render(
      <NotificationCard
        item={item()}
        selecting={false}
        selected={false}
        onOpen={onOpen}
        onRead={vi.fn()}
        onRemove={vi.fn()}
        onToggleSelect={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByText("有人回复了你"));
    expect(onOpen).toHaveBeenCalled();
  });

  it("选择模式下点击主体触发 onToggleSelect 而非 onOpen", () => {
    const onOpen = vi.fn();
    const onToggleSelect = vi.fn();
    render(
      <NotificationCard
        item={item()}
        selecting
        selected={false}
        onOpen={onOpen}
        onRead={vi.fn()}
        onRemove={vi.fn()}
        onToggleSelect={onToggleSelect}
      />,
    );
    fireEvent.click(screen.getByText("有人回复了你"));
    expect(onToggleSelect).toHaveBeenCalledWith(1);
    expect(onOpen).not.toHaveBeenCalled();
  });
});

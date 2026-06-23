import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { ReactNode } from "react";
import type { NotificationItemResp } from "@repo/api";
import NotificationCard from "./notification-card";

vi.mock("@repo/icons", () => ({
  SvgIcon: ({ name }: { name: string }) => <span data-icon={name} />,
}));
vi.mock("@repo/ui", () => ({
  Button: ({
    children,
    onPress,
    ...p
  }: {
    children: ReactNode;
    onPress?: () => void;
    [key: string]: unknown;
  }) => (
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

function getIconWrap(iconName: string): HTMLElement {
  const icon = document.querySelector(`[data-icon="${iconName}"]`);
  expect(icon).toBeInstanceOf(HTMLElement);
  expect(icon?.parentElement).toBeInstanceOf(HTMLElement);
  return icon?.parentElement as HTMLElement;
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

  it("未读点赞图标使用粉色线性风格色，已读后降为中性色", () => {
    const { rerender } = render(
      <NotificationCard
        item={item({ type: "like", root_type: "moment", title: "你的碎语收到一个赞" })}
        selecting={false}
        selected={false}
        onOpen={vi.fn()}
        onRead={vi.fn()}
        onRemove={vi.fn()}
        onToggleSelect={vi.fn()}
      />,
    );

    expect(screen.getByText("你的碎语收到一个赞")).toBeTruthy();
    const unreadIconWrap = getIconWrap("heart");
    expect(unreadIconWrap?.className).toContain("bg-rose-100");
    expect(unreadIconWrap?.className).toContain("text-rose-700");
    expect(unreadIconWrap?.className).toContain("dark:bg-rose-500/20");
    expect(unreadIconWrap?.className).toContain("dark:text-rose-300");

    rerender(
      <NotificationCard
        item={item({
          type: "like",
          root_type: "moment",
          title: "你的碎语收到一个赞",
          is_read: true,
        })}
        selecting={false}
        selected={false}
        onOpen={vi.fn()}
        onRead={vi.fn()}
        onRemove={vi.fn()}
        onToggleSelect={vi.fn()}
      />,
    );

    const readIconWrap = getIconWrap("heart");
    expect(readIconWrap?.className).toContain("bg-zinc-100");
    expect(readIconWrap?.className).toContain("text-zinc-400");
    expect(readIconWrap?.className).toContain("dark:bg-zinc-800");
    expect(readIconWrap?.className).toContain("dark:text-zinc-400");
  });

  it("留言板默认图标使用线性 pen，并用蓝色区分已读态", () => {
    render(
      <NotificationCard
        item={item({ root_type: "guestbook", type: "" })}
        selecting={false}
        selected={false}
        onOpen={vi.fn()}
        onRead={vi.fn()}
        onRemove={vi.fn()}
        onToggleSelect={vi.fn()}
      />,
    );

    const iconWrap = getIconWrap("pen");
    expect(iconWrap.className).toContain("bg-sky-100");
    expect(iconWrap.className).toContain("text-sky-700");
    expect(iconWrap.className).toContain("dark:bg-sky-500/20");
    expect(iconWrap.className).toContain("dark:text-sky-300");
  });

  it("右侧操作按钮保持常显", () => {
    render(
      <NotificationCard
        item={item()}
        selecting={false}
        selected={false}
        onOpen={vi.fn()}
        onRead={vi.fn()}
        onRemove={vi.fn()}
        onToggleSelect={vi.fn()}
      />,
    );

    const actionWrap = screen.getByLabelText("删除").parentElement;
    expect(actionWrap?.className).not.toContain("md:opacity-0");
    expect(actionWrap?.className).not.toContain("group-hover");
  });
});

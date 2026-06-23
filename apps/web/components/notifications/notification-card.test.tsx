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
vi.mock("@/components/common/user-avatar", () => ({
  UserAvatar: ({ src, name }: { src?: string; name: string }) => (
    <span data-testid="avatar" data-src={src ?? ""}>
      {name}
    </span>
  ),
}));
vi.mock("@/lib/format-time", () => ({
  formatDateTime: () => "2026-06-23 18:00",
  formatRelativeTime: () => "9 小时前",
}));
vi.mock("./notification-excerpt-content", () => ({
  NotificationExcerptContent: ({ content }: { content: string }) => (
    <div data-testid="notification-body">{content}</div>
  ),
}));
vi.mock("./notification-inline-reply-input", () => ({
  NotificationInlineReplyInput: ({
    onSubmit,
    onCancel,
    value,
    onChange,
  }: {
    onSubmit: () => void;
    onCancel: () => void;
    value: string;
    onChange: (v: string) => void;
  }) => (
    <div data-testid="inline-reply">
      <textarea aria-label="回复输入" value={value} onChange={(e) => onChange(e.target.value)} />
      <button type="button" onClick={onSubmit}>
        发送回复
      </button>
      <button type="button" onClick={onCancel}>
        取消回复
      </button>
    </div>
  ),
}));

function item(over: Partial<NotificationItemResp> = {}): NotificationItemResp {
  return {
    id: 1,
    event_id: 1,
    type: "comment_created",
    title: "有人回复了你",
    content_excerpt: "评论正文",
    is_read: false,
    created_at: "2026-06-23T10:00:00Z",
    source_type: "comment",
    source_id: 42,
    root_type: "article",
    root_id: 5,
    source_deleted: false,
    root_deleted: false,
    actor_user: { id: 2, nickname: "VPT", avatar_url: "https://cdn.example/a.png" },
    ...over,
  };
}

describe("NotificationCard", () => {
  it("渲染操作人昵称与头像", () => {
    render(
      <NotificationCard
        item={item()}
        selecting={false}
        selected={false}
        onOpen={vi.fn()}
        onRead={vi.fn()}
        onToggleSelect={vi.fn()}
      />,
    );
    expect(screen.getAllByText("VPT").length).toBeGreaterThan(0);
    expect(screen.getByTestId("avatar")).toHaveAttribute("data-src", "https://cdn.example/a.png");
  });

  it("渲染动作文案与时间", () => {
    render(
      <NotificationCard
        item={item()}
        selecting={false}
        selected={false}
        onOpen={vi.fn()}
        onRead={vi.fn()}
        onToggleSelect={vi.fn()}
      />,
    );
    expect(screen.getByText("评论了你的文章")).toBeTruthy();
    expect(screen.getByText("9 小时前")).toBeTruthy();
  });

  it("文章点赞渲染 metadata 快照标题与摘要", () => {
    render(
      <NotificationCard
        item={item({
          type: "article_liked",
          content_excerpt: "",
          source_type: "article",
          metadata:
            '{"root_snapshot":{"type":"article","id":5,"title":"Go 并发","excerpt":"摘录段落"}}',
        })}
        selecting={false}
        selected={false}
        onOpen={vi.fn()}
        onRead={vi.fn()}
        onToggleSelect={vi.fn()}
      />,
    );
    expect(screen.getByText("Go 并发")).toBeTruthy();
    expect(screen.getByText("摘录段落")).toBeTruthy();
    expect(screen.queryByText("点赞")).toBeNull();
    expect(screen.queryByText("回复")).toBeNull();
  });

  it("评论创建渲染正文、引用标题与内联操作", () => {
    const onInlineLike = vi.fn();
    const onInlineReplySubmit = vi.fn().mockResolvedValue(true);
    render(
      <NotificationCard
        item={item({
          content_excerpt: "评论正文",
          like_count: 3,
          is_liked: true,
          reply_count: 2,
          metadata:
            '{"root_snapshot":{"type":"article","id":5,"title":"设计系统","excerpt":"文章正文摘录"}}',
        })}
        selecting={false}
        selected={false}
        onOpen={vi.fn()}
        onRead={vi.fn()}
        onToggleSelect={vi.fn()}
        onInlineLike={onInlineLike}
        onInlineReplySubmit={onInlineReplySubmit}
      />,
    );
    expect(screen.getByText("评论正文")).toBeTruthy();
    expect(screen.getByTestId("notification-body")).toHaveTextContent("评论正文");
    expect(screen.getByText("《设计系统》")).toBeTruthy();
    expect(screen.getByText("文章正文摘录")).toBeTruthy();
    expect(screen.getByText("3")).toBeTruthy();
    expect(screen.getByText("2")).toBeTruthy();
    expect(screen.getByLabelText("取消点赞")).toBeTruthy();
    fireEvent.click(screen.getByLabelText("取消点赞"));
    fireEvent.click(screen.getByText("回复"));
    expect(onInlineLike).toHaveBeenCalled();
    expect(screen.getByTestId("inline-reply")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("回复输入"), { target: { value: "好的" } });
    fireEvent.click(screen.getByText("发送回复"));
    expect(onInlineReplySubmit).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }), "好的");
  });

  it("发表留言不渲染留言板引用块", () => {
    render(
      <NotificationCard
        item={item({
          type: "guestbook_created",
          root_type: "guestbook",
          content_excerpt: "这是新留言",
          source_type: "guestbook",
          source_id: 8,
        })}
        selecting={false}
        selected={false}
        onOpen={vi.fn()}
        onRead={vi.fn()}
        onToggleSelect={vi.fn()}
      />,
    );
    expect(screen.getByText("发表了留言")).toBeTruthy();
    expect(screen.getByText("这是新留言")).toBeTruthy();
    expect(screen.queryByText("留言板")).toBeNull();
  });

  it("留言回复只渲染被回复评论引用，无留言板标题", () => {
    render(
      <NotificationCard
        item={item({
          type: "reply_created",
          root_type: "guestbook",
          content_excerpt: "这是回复内容",
          metadata:
            '{"root_snapshot":{"type":"guestbook","id":8,"excerpt":"根留言正文"},"quote_snapshot":{"type":"comment","id":8,"excerpt":"这是被回复的留言"}}',
          source_type: "reply",
          source_id: 10,
        })}
        selecting={false}
        selected={false}
        onOpen={vi.fn()}
        onRead={vi.fn()}
        onToggleSelect={vi.fn()}
      />,
    );
    expect(screen.getByText("回复了留言下你的评论")).toBeTruthy();
    expect(screen.getByText("这是回复内容")).toBeTruthy();
    expect(screen.queryByText("留言板")).toBeNull();
    expect(screen.getByText("这是被回复的留言")).toBeTruthy();
  });

  it("source 已删除时展示删除文案且不显示内联操作", () => {
    render(
      <NotificationCard
        item={item({
          type: "reply_created",
          source_type: "reply",
          source_deleted: true,
          content_excerpt: "旧回复内容",
          like_count: 1,
          reply_count: 1,
        })}
        selecting={false}
        selected={false}
        onOpen={vi.fn()}
        onRead={vi.fn()}
        onToggleSelect={vi.fn()}
        onInlineLike={vi.fn()}
        onInlineReplySubmit={vi.fn()}
      />,
    );
    expect(screen.getByText("回复已删除")).toBeTruthy();
    expect(screen.queryByText("点赞")).toBeNull();
    expect(screen.queryByText("回复")).toBeNull();
  });

  it("root 已删除时展示根对象删除文案", () => {
    render(
      <NotificationCard
        item={item({
          root_deleted: true,
          metadata: '{"root_snapshot":{"type":"article","id":5,"title":"设计系统"}}',
        })}
        selecting={false}
        selected={false}
        onOpen={vi.fn()}
        onRead={vi.fn()}
        onToggleSelect={vi.fn()}
      />,
    );
    expect(screen.getByText("《设计系统》")).toBeTruthy();
    expect(screen.getByText("文章已删除")).toBeTruthy();
  });

  it("内联操作点击不触发 onOpen", () => {
    const onOpen = vi.fn();
    render(
      <NotificationCard
        item={item()}
        selecting={false}
        selected={false}
        onOpen={onOpen}
        onRead={vi.fn()}
        onToggleSelect={vi.fn()}
        onInlineLike={vi.fn()}
        onInlineReplySubmit={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByLabelText("点赞"));
    expect(onOpen).not.toHaveBeenCalled();
  });

  it("未读显示标记已读按钮，点击触发 onRead", () => {
    const onRead = vi.fn();
    render(
      <NotificationCard
        item={item()}
        selecting={false}
        selected={false}
        onOpen={vi.fn()}
        onRead={onRead}
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
        onToggleSelect={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByText("评论了你的文章"));
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
        onToggleSelect={onToggleSelect}
      />,
    );
    fireEvent.click(screen.getByText("评论了你的文章"));
    expect(onToggleSelect).toHaveBeenCalledWith(1);
    expect(onOpen).not.toHaveBeenCalled();
  });
});

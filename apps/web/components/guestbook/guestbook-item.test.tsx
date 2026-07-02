// @vitest-environment jsdom
import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { GuestbookItem } from "./guestbook-item";
import type { GuestbookItemResp } from "@repo/api";

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@repo/icons", () => ({
  SvgIcon: ({ name }: { name: string }) => <span data-testid={`icon-${name}`} />,
}));

vi.mock("@repo/markdown", () => ({
  markdownToHtmlSync: (content: string) => content,
  wrapMarkdownImagesWithSkeletonHtml: (h: string) => h,
  deferMarkdownImageSources: (h: string) => h,
  MarkdownContent: ({ html }: { html: string }) => (
    <div dangerouslySetInnerHTML={{ __html: html }} />
  ),
}));

vi.mock("@/components/common/user-avatar", () => ({
  UserAvatar: ({ name }: { name?: string }) => <div data-testid="avatar" aria-label={name} />,
}));

vi.mock("@/lib/format-time", () => ({
  formatDateTime: () => "2020-04-17 15:54",
}));

vi.mock("@/app/providers/session-provider", () => ({
  useSession: () => ({ userId: 1 }),
}));

vi.mock("@/store/use-login-modal", () => ({
  useLoginModal: (selector?: (s: { open: ReturnType<typeof vi.fn> }) => unknown) => {
    const store = { open: vi.fn() };
    return typeof selector === "function" ? selector(store) : store;
  },
}));

// 编辑器/回复框在留言项内联渲染；测试只关心初始值与提交回调，mock 掉共享组件
vi.mock("@/components/comments/inputs/inline-reply-editor", () => ({
  InlineReplyEditor: ({
    initialValue = "",
    header,
    onSubmit,
  }: {
    initialValue?: string;
    header?: React.ReactNode;
    onSubmit: (content: string) => Promise<boolean>;
  }) => (
    <div data-testid="inline-editor">
      {header}
      <textarea data-testid="inline-editor-value" readOnly value={initialValue} />
      <button type="button" onClick={() => void onSubmit(initialValue || "内联提交内容")}>
        保存
      </button>
    </div>
  ),
}));

const mockItem: GuestbookItemResp = {
  id: 1,
  owner_user_id: 0,
  from_user_id: 1,
  content: "这是一条留言",
  user: { id: 1, username: "alice", nickname: "Alice" },
  reply_count: 0,
  like_count: 3,
  is_liked: false,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

describe("GuestbookItem", () => {
  it("渲染留言内容和用户名", () => {
    render(<GuestbookItem item={mockItem} />);
    expect(screen.getByText("这是一条留言")).toBeTruthy();
    expect(screen.getByText("Alice")).toBeTruthy();
  });

  it("用户名和头像可跳转至用户主页", () => {
    render(<GuestbookItem item={mockItem} />);
    const links = screen.getAllByRole("link", { name: "Alice" });
    expect(links.some((link) => link.getAttribute("href") === "/users/1")).toBe(true);
  });

  it("显示 like_count", () => {
    render(<GuestbookItem item={mockItem} />);
    expect(screen.getByText("3")).toBeTruthy();
  });

  it("like_count 为 0 时显示 0", () => {
    render(<GuestbookItem item={{ ...mockItem, like_count: 0 }} />);
    expect(screen.getByTestId("like-count").textContent).toBe("0");
  });

  it("点击点赞按钮调用 onLike", async () => {
    const onLike = vi.fn();
    render(<GuestbookItem item={mockItem} onLike={onLike} />);
    await userEvent.click(screen.getByRole("button", { name: /点赞/ }));
    expect(onLike).toHaveBeenCalledWith(1);
  });

  it("点击回复按钮内联展开回复框，提交时调用 onSubmitReply", async () => {
    const onSubmitReply = vi.fn().mockResolvedValue(true);
    render(<GuestbookItem item={mockItem} onSubmitReply={onSubmitReply} />);

    expect(screen.queryByTestId("inline-editor")).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "回复" }));
    expect(screen.getByTestId("inline-editor")).toBeTruthy();

    await userEvent.click(screen.getByText("保存"));
    expect(onSubmitReply).toHaveBeenCalledWith(1, undefined, "内联提交内容");
  });

  it("展开回复框后按钮变为取消回复，再次点击收起", async () => {
    render(<GuestbookItem item={mockItem} onSubmitReply={vi.fn().mockResolvedValue(true)} />);

    await userEvent.click(screen.getByRole("button", { name: "回复" }));
    expect(screen.getByTestId("inline-editor")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "回复" })).toBeNull();

    // ReplyBanner 里的取消「×」按钮也叫 aria-label「取消回复」，头部按钮取第一个即可
    await userEvent.click(screen.getAllByRole("button", { name: "取消回复" })[0]!);
    expect(screen.queryByTestId("inline-editor")).toBeNull();
    expect(screen.getByRole("button", { name: "回复" })).toBeTruthy();
  });

  it("当前用户是留言作者时显示删除按钮并二次确认", async () => {
    const onDelete = vi.fn().mockResolvedValue(undefined);
    render(<GuestbookItem item={mockItem} currentUserId={1} onDelete={onDelete} />);

    await userEvent.click(screen.getByRole("button", { name: "删除留言" }));
    expect(screen.getByText("确定删除这条留言吗？")).toBeTruthy();

    await userEvent.click(screen.getByRole("button", { name: "删除" }));
    expect(onDelete).toHaveBeenCalledWith(1);
  });

  it("当前用户不是留言作者时不显示删除按钮", () => {
    render(<GuestbookItem item={mockItem} currentUserId={99} onDelete={vi.fn()} />);
    expect(screen.queryByRole("button", { name: "删除留言" })).toBeNull();
  });

  it("无论是否点赞均有心跳动效", () => {
    const { container, rerender } = render(
      <GuestbookItem item={{ ...mockItem, is_liked: false }} />,
    );
    expect(
      container.querySelector(".animate-\\[heartbeat_3s_ease-in-out_infinite\\]"),
    ).toBeTruthy();

    rerender(<GuestbookItem item={{ ...mockItem, is_liked: true }} />);
    expect(
      container.querySelector(".animate-\\[heartbeat_3s_ease-in-out_infinite\\]"),
    ).toBeTruthy();
  });

  it("点赞与未点赞均使用 heart-fill 图标", () => {
    const { rerender } = render(<GuestbookItem item={{ ...mockItem, is_liked: false }} />);
    expect(screen.getByTestId("icon-heart-fill")).toBeTruthy();
    expect(screen.queryByTestId("icon-heart")).toBeNull();

    rerender(<GuestbookItem item={{ ...mockItem, is_liked: true }} />);
    expect(screen.getByTestId("icon-heart-fill")).toBeTruthy();
    expect(screen.queryByTestId("icon-heart")).toBeNull();
  });

  it("显示格式化的发布时间", () => {
    render(<GuestbookItem item={mockItem} />);
    expect(screen.getByText("2020-04-17 15:54")).toBeTruthy();
  });

  it("不显示用户身份标签和站点链接", () => {
    render(
      <GuestbookItem
        item={{
          ...mockItem,
          user: { ...mockItem.user!, mark: "ADMIN", site: "https://blog.ncgame.cc/" },
        }}
      />,
    );
    expect(screen.queryByText("ADMIN")).toBeNull();
    expect(screen.queryByText("blog.ncgame.cc/")).toBeNull();
  });

  it("无回复时使用 pb-2，有回复时使用 pb-5", () => {
    const { container, rerender } = render(<GuestbookItem item={mockItem} />);
    expect(container.firstElementChild?.className).toContain("pt-4");
    expect(container.firstElementChild?.className).toContain("pb-2");
    expect(container.firstElementChild?.className).not.toContain("pb-5");

    rerender(<GuestbookItem item={{ ...mockItem, reply_count: 3 }} />);
    expect(container.firstElementChild?.className).toContain("pt-4");
    expect(container.firstElementChild?.className).toContain("pb-5");
    expect(container.firstElementChild?.className).not.toContain("pb-2");
  });

  describe("审核展示", () => {
    it("低风险留言渲染正文并展示「待审核」徽标", () => {
      render(
        <GuestbookItem
          item={{
            ...mockItem,
            content: "新版本正文",
            moderation: {
              public_state: "visible",
              display_version: "pending",
              has_pending_revision: true,
              pending_risk_level: "low",
              can_interact: true,
            },
          }}
        />,
      );
      expect(screen.getByText("新版本正文")).toBeTruthy();
      expect(screen.getByText("待审核")).toBeTruthy();
    });

    it("public_state=placeholder 时访客渲染安全占位，不泄露提交正文或 pending_content", () => {
      render(
        <GuestbookItem
          item={{
            ...mockItem,
            content: "提交正文",
            moderation: {
              public_state: "placeholder",
              display_version: "none",
              has_pending_revision: true,
              pending_risk_level: "medium",
              pending_content: "待审正文不该出现",
              can_interact: false,
            },
          }}
        />,
      );
      expect(screen.getByText("内容存在风险，正在等待人工审核。")).toBeTruthy();
      expect(screen.queryByText("提交正文")).toBeNull();
      expect(screen.queryByText("待审正文不该出现")).toBeNull();
    });

    it("public_state=placeholder 时作者可见 pending_content 正文", () => {
      render(
        <GuestbookItem
          item={{
            ...mockItem,
            content: "",
            moderation: {
              public_state: "placeholder",
              display_version: "none",
              has_pending_revision: true,
              pending_risk_level: "medium",
              pending_content: "我的待审留言",
              can_interact: false,
            },
          }}
          currentUserId={1}
        />,
      );
      expect(screen.getByText("我的待审留言")).toBeTruthy();
      expect(screen.queryByText("内容存在风险，正在等待人工审核。")).toBeNull();
    });

    it("can_interact=false 时点击点赞不调用 onLike，且不渲染回复按钮", async () => {
      const onLike = vi.fn();
      const onSubmitReply = vi.fn().mockResolvedValue(true);
      render(
        <GuestbookItem
          item={{
            ...mockItem,
            moderation: {
              public_state: "hidden",
              display_version: "none",
              has_pending_revision: false,
              can_interact: false,
            },
          }}
          onLike={onLike}
          onSubmitReply={onSubmitReply}
        />,
      );
      // 回复按钮不应出现
      expect(screen.queryByRole("button", { name: "回复" })).toBeNull();
      // 点赞与回复入口都不应提供
      expect(screen.queryByRole("button", { name: /点赞/ })).toBeNull();
      expect(onLike).not.toHaveBeenCalled();
    });
  });

  describe("作者编辑", () => {
    it("作者是当前用户且提供 onEdit 时展示「编辑」入口", () => {
      const onEdit = vi.fn().mockResolvedValue(true);
      render(<GuestbookItem item={mockItem} currentUserId={1} onEdit={onEdit} />);
      expect(screen.getByRole("button", { name: "编辑留言" })).toBeTruthy();
    });

    it("非作者不展示编辑入口", () => {
      const onEdit = vi.fn();
      render(<GuestbookItem item={mockItem} currentUserId={99} onEdit={onEdit} />);
      expect(screen.queryByRole("button", { name: "编辑留言" })).toBeNull();
    });

    it("展开编辑框后按钮变为取消编辑，再次点击收起", async () => {
      const onEdit = vi.fn().mockResolvedValue(true);
      render(<GuestbookItem item={mockItem} currentUserId={1} onEdit={onEdit} />);

      await userEvent.click(screen.getByRole("button", { name: "编辑留言" }));
      expect(screen.getByTestId("inline-editor")).toBeTruthy();
      expect(screen.queryByRole("button", { name: "编辑留言" })).toBeNull();

      // ReplyBanner 里的取消「×」按钮也叫 aria-label「取消编辑」，头部按钮取第一个即可
      await userEvent.click(screen.getAllByRole("button", { name: "取消编辑" })[0]!);
      expect(screen.queryByTestId("inline-editor")).toBeNull();
      expect(screen.getByRole("button", { name: "编辑留言" })).toBeTruthy();
    });

    it("中风险留言：公开显示旧正文，编辑器初始正文为 pending_content", async () => {
      const onEdit = vi.fn().mockResolvedValue(true);
      render(
        <GuestbookItem
          item={{
            ...mockItem,
            content: "旧版本正文",
            moderation: {
              public_state: "visible",
              display_version: "last_approved",
              has_pending_revision: true,
              pending_risk_level: "medium",
              pending_content: "待审新版本",
              can_interact: true,
            },
          }}
          currentUserId={1}
          onEdit={onEdit}
        />,
      );
      // 公开仍显示最后通过版本
      expect(screen.getByText("旧版本正文")).toBeTruthy();

      await userEvent.click(screen.getByRole("button", { name: "编辑留言" }));
      // 编辑器初始正文使用 pending_content
      expect(screen.getByTestId("inline-editor-value")).toHaveValue("待审新版本");

      await userEvent.click(screen.getByRole("button", { name: "保存" }));
      await Promise.resolve();
      expect(onEdit).toHaveBeenCalledWith(1, "待审新版本");
    });

    it("无 pending_content 时编辑器初始正文回退到正文", async () => {
      const onEdit = vi.fn().mockResolvedValue(true);
      render(
        <GuestbookItem
          item={{ ...mockItem, content: "普通正文", moderation: undefined }}
          currentUserId={1}
          onEdit={onEdit}
        />,
      );
      await userEvent.click(screen.getByRole("button", { name: "编辑留言" }));
      expect(screen.getByTestId("inline-editor-value")).toHaveValue("普通正文");
    });

    it("存在待审版本时编辑横幅展示「编辑中 · 内容正在审核」", async () => {
      const onEdit = vi.fn().mockResolvedValue(true);
      render(
        <GuestbookItem
          item={{
            ...mockItem,
            content: "旧版本正文",
            moderation: {
              public_state: "visible",
              display_version: "last_approved",
              has_pending_revision: true,
              pending_risk_level: "medium",
              pending_content: "待审新版本",
              can_interact: true,
            },
          }}
          currentUserId={1}
          onEdit={onEdit}
        />,
      );

      await userEvent.click(screen.getByRole("button", { name: "编辑留言" }));
      expect(screen.getByText("编辑中 · 内容正在审核")).toBeTruthy();
      expect(screen.queryByText("编辑中", { exact: true })).toBeNull();
    });

    it("无待审版本时编辑横幅仅展示「编辑中」，不带审核后缀", async () => {
      const onEdit = vi.fn().mockResolvedValue(true);
      render(
        <GuestbookItem
          item={{ ...mockItem, content: "普通正文", moderation: undefined }}
          currentUserId={1}
          onEdit={onEdit}
        />,
      );
      await userEvent.click(screen.getByRole("button", { name: "编辑留言" }));
      expect(screen.getByText("编辑中", { exact: true })).toBeTruthy();
      expect(screen.queryByText("编辑中 · 内容正在审核")).toBeNull();
    });
  });
});

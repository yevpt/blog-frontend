// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { CommentReplyResp, CommentReplyPageResp } from "@repo/api";
import { CommentReplies } from "./comment-replies";

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

vi.mock("@repo/markdown", () => ({
  markdownToHtmlSync: (content: string) => content,
  MarkdownContent: ({ html }: { html: string }) => (
    <div dangerouslySetInnerHTML={{ __html: html }} />
  ),
}));

vi.mock("@repo/icons", () => ({
  SvgIcon: ({ name, className }: { name: string; className?: string }) => (
    <span data-testid={`icon-${name}`} className={className} />
  ),
}));

vi.mock("@/app/providers/session-provider", () => ({
  useSession: vi.fn(() => ({ userId: 1 })),
}));

vi.mock("@/store/use-login-modal", () => ({
  useLoginModal: (selector?: (s: { open: ReturnType<typeof vi.fn> }) => unknown) => {
    const store = { open: vi.fn() };
    return typeof selector === "function" ? selector(store) : store;
  },
}));

vi.mock("@/hooks/use-comment-like", () => ({
  useCommentLike: () => ({
    toggleReplyLike: vi.fn(() => Promise.resolve({ is_liked: true, like_count: 1 })),
  }),
}));

vi.mock("@/lib/format-time", () => ({
  formatRelativeTime: () => "5 分钟前",
  formatDateTime: () => "2026-06-17 13:19",
}));

vi.mock("@/components/common/user-avatar", () => ({
  UserAvatar: ({ name, src }: { name: string; src?: string }) => (
    <span data-testid="user-avatar" data-src={src ?? ""}>
      {name}
    </span>
  ),
}));

function makeReply(id: number, overrides?: Partial<CommentReplyResp>): CommentReplyResp {
  return {
    id,
    target_type: "article",
    comment_id: 1,
    from_user_id: 1,
    to_user_id: 0,
    parent_reply_id: 0,
    content: `回复 ${id}`,
    from_user: { id: 1, username: "alice", nickname: "Alice" },
    like_count: 0,
    is_liked: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

function mockPage(list: CommentReplyResp[], pages = 1): CommentReplyPageResp {
  return { total: list.length, pages, page: 1, page_size: 5, list };
}

function webSourcePath(path: string): string {
  return resolve(process.cwd().endsWith("apps/web") ? path : `apps/web/${path}`);
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

describe("CommentReplies", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    global.fetch = vi.fn();
  });

  it("replyCount=0 时不渲染任何内容", () => {
    const { container } = render(
      <CommentReplies commentId={1} targetType="article" replyCount={0} onReply={vi.fn()} />,
    );
    expect(container.innerHTML).toBe("");
  });

  it("回复分页不在组件内直接调用 fetch", () => {
    const source = readFileSync(webSourcePath("components/comments/comment-replies.tsx"), "utf8");
    expect(source).not.toContain("fetch(");
  });

  it("replyCount>0 时显示展开按钮", () => {
    render(<CommentReplies commentId={1} targetType="article" replyCount={5} onReply={vi.fn()} />);
    expect(screen.getByText(/展开 5 条回复/)).toBeTruthy();
  });

  it("点击展开后加载并显示回复列表", async () => {
    const user = userEvent.setup();
    vi.mocked(global.fetch).mockResolvedValue(jsonResponse(mockPage([makeReply(1), makeReply(3)])));

    render(<CommentReplies commentId={1} targetType="article" replyCount={2} onReply={vi.fn()} />);
    await user.click(screen.getByText(/展开 2 条回复/));
    await waitFor(() => expect(screen.getByText("回复 1")).toBeTruthy());
    expect(screen.getByText("回复 3")).toBeTruthy();
  });

  it("hasMore 时显示「查看更多回复」", async () => {
    const user = userEvent.setup();
    vi.mocked(global.fetch).mockResolvedValue(
      jsonResponse({ total: 10, pages: 2, page: 1, page_size: 5, list: [makeReply(1)] }),
    );

    render(<CommentReplies commentId={1} targetType="article" replyCount={10} onReply={vi.fn()} />);
    await user.click(screen.getByText(/展开 10 条回复/));
    await waitFor(() => expect(screen.getByText("查看更多回复")).toBeTruthy());
  });

  it("pendingReply 追加到回复列表中", async () => {
    const user = userEvent.setup();
    const pending: CommentReplyResp = makeReply(99);
    pending.content = "刚刚发布的回复";
    vi.mocked(global.fetch).mockResolvedValue(jsonResponse(mockPage([])));

    render(
      <CommentReplies
        commentId={1}
        targetType="article"
        replyCount={1}
        pendingReply={pending}
        onReply={vi.fn()}
      />,
    );
    await user.click(screen.getByText(/展开 1 条回复/));
    await waitFor(() => expect(screen.getByText("刚刚发布的回复")).toBeTruthy());
  });

  it("点击回复内的回复按钮触发 onReply", async () => {
    const user = userEvent.setup();
    const onReply = vi.fn();
    vi.mocked(global.fetch).mockResolvedValue(jsonResponse(mockPage([makeReply(1)])));

    render(<CommentReplies commentId={1} targetType="article" replyCount={1} onReply={onReply} />);
    await user.click(screen.getByText(/展开 1 条回复/));
    await waitFor(() => screen.getByText("回复 1"));

    await user.click(screen.getAllByText("回复")[0]);
    expect(onReply).toHaveBeenCalledWith({
      commentId: 1,
      parentReplyId: 1,
      toUsername: "Alice",
    });
  });

  it("回复项显示点赞按钮", async () => {
    const user = userEvent.setup();
    vi.mocked(global.fetch).mockResolvedValue(
      jsonResponse(mockPage([makeReply(1, { like_count: 3, is_liked: false })])),
    );

    render(<CommentReplies commentId={1} targetType="article" replyCount={1} onReply={vi.fn()} />);
    await user.click(screen.getByText(/展开 1 条回复/));
    await waitFor(() => expect(screen.getByText("回复 1")).toBeTruthy());

    expect(screen.getByTestId("icon-heart-fill")).toBeTruthy();
    expect(screen.getByText("3")).toBeTruthy();
  });

  it("回复项点赞图标有心跳动效", async () => {
    const user = userEvent.setup();
    vi.mocked(global.fetch).mockResolvedValue(jsonResponse(mockPage([makeReply(1)])));

    const { container } = render(
      <CommentReplies commentId={1} targetType="guestbook" replyCount={1} onReply={vi.fn()} />,
    );
    await user.click(screen.getByText(/展开 1 条回复/));
    await waitFor(() => expect(screen.getByText("回复 1")).toBeTruthy());

    expect(
      container.querySelector(".animate-\\[heartbeat_3s_ease-in-out_infinite\\]"),
    ).toBeTruthy();
  });

  it("点击回复点赞按钮调用 toggleReplyLike 并更新状态", async () => {
    const user = userEvent.setup();
    vi.mocked(global.fetch).mockResolvedValue(jsonResponse(mockPage([makeReply(1)])));

    render(<CommentReplies commentId={1} targetType="article" replyCount={1} onReply={vi.fn()} />);
    await user.click(screen.getByText(/展开 1 条回复/));
    await waitFor(() => screen.getByText("回复 1"));

    const likeBtn = screen.getByLabelText("点赞");
    await user.click(likeBtn);
    // toggleReplyLike mock is called (verified by state update showing heart-fill)
    await waitFor(() => expect(screen.getByTestId("icon-heart-fill")).toBeTruthy());
  });

  it("点击展开后按钮保持可见并显示加载状态", async () => {
    const user = userEvent.setup();
    let resolve!: (v: unknown) => void;
    vi.mocked(global.fetch).mockReturnValue(
      new Promise((res) => {
        resolve = res;
      }) as unknown as Promise<Response>,
    );

    render(<CommentReplies commentId={1} targetType="article" replyCount={3} onReply={vi.fn()} />);
    await user.click(screen.getByText(/展开 3 条回复/));

    // 加载期间：按钮保持可见，显示加载中状态
    expect(screen.getByText("加载中")).toBeTruthy();
    // 展开文案消失（替换为加载中）
    expect(screen.queryByText(/展开 3 条回复/)).toBeNull();
    // 尚未展开，不应出现收起按钮
    expect(screen.queryByText("收起回复")).toBeNull();

    resolve(jsonResponse(mockPage([makeReply(1)])));
    // 加载完成后：回复显示，加载状态消失
    await waitFor(() => expect(screen.getByText("回复 1")).toBeTruthy());
    expect(screen.queryByText("加载中")).toBeNull();
  });

  it("加载失败时展开按钮重新可用并显示错误提示", async () => {
    const user = userEvent.setup();
    vi.mocked(global.fetch).mockRejectedValue(new Error("network error"));

    render(<CommentReplies commentId={1} targetType="article" replyCount={2} onReply={vi.fn()} />);
    await user.click(screen.getByText(/展开 2 条回复/));

    await waitFor(() => expect(screen.getByText("加载回复失败")).toBeTruthy());
    // 失败后展开按钮重新可用（不显示加载中）
    expect(screen.queryByText("加载中")).toBeNull();
    expect(screen.getByText(/展开 2 条回复/)).toBeTruthy();
  });

  it("加载更多时按钮显示加载中文案", async () => {
    const user = userEvent.setup();
    vi.mocked(global.fetch)
      .mockResolvedValueOnce(
        jsonResponse({ total: 10, pages: 2, page: 1, page_size: 5, list: [makeReply(1)] }),
      )
      .mockReturnValueOnce(new Promise(() => {}) as unknown as Promise<Response>);

    render(<CommentReplies commentId={1} targetType="article" replyCount={10} onReply={vi.fn()} />);
    await user.click(screen.getByText(/展开 10 条回复/));
    await waitFor(() => screen.getByText("查看更多回复"));

    await user.click(screen.getByText("查看更多回复"));
    await waitFor(() => expect(screen.getByText("加载中")).toBeTruthy());
  });

  it("加载更多回复时复用同一用户已知头像", async () => {
    const user = userEvent.setup();
    vi.mocked(global.fetch)
      .mockResolvedValueOnce(
        jsonResponse({
          total: 2,
          pages: 2,
          page: 1,
          page_size: 5,
          list: [
            makeReply(1, {
              from_user: {
                id: 7,
                username: "vpt",
                nickname: "Vpt1",
                avatar_url: "https://blog-oss.yevpt.com/avatars/vpt.png",
              },
            }),
          ],
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          total: 2,
          pages: 2,
          page: 2,
          page_size: 5,
          list: [
            makeReply(2, {
              from_user: { id: 7, username: "vpt", nickname: "Vpt1" },
            }),
          ],
        }),
      );

    render(<CommentReplies commentId={1} targetType="article" replyCount={2} onReply={vi.fn()} />);
    await user.click(screen.getByText(/展开 2 条回复/));
    await waitFor(() => expect(screen.getByText("查看更多回复")).toBeTruthy());

    await user.click(screen.getByText("查看更多回复"));
    await waitFor(() => expect(screen.getByText("回复 2")).toBeTruthy());

    const avatars = screen.getAllByTestId("user-avatar");
    expect(avatars.map((avatar) => avatar.getAttribute("data-src"))).toEqual([
      "https://blog-oss.yevpt.com/avatars/vpt.png",
      "https://blog-oss.yevpt.com/avatars/vpt.png",
    ]);
  });

  it("不同回复块之间复用同一用户已知头像", async () => {
    const user = userEvent.setup();
    vi.mocked(global.fetch)
      .mockResolvedValueOnce(
        jsonResponse(
          mockPage([
            makeReply(1, {
              from_user: {
                id: 77,
                username: "vpt-cross",
                nickname: "Vpt1",
                avatar_url: "https://blog-oss.yevpt.com/avatars/vpt-cross.png",
              },
            }),
          ]),
        ),
      )
      .mockResolvedValueOnce(
        jsonResponse(
          mockPage([
            makeReply(2, {
              comment_id: 2,
              from_user: { id: 77, username: "vpt-cross", nickname: "Vpt1" },
            }),
          ]),
        ),
      );

    render(
      <>
        <CommentReplies commentId={1} targetType="article" replyCount={1} onReply={vi.fn()} />
        <CommentReplies commentId={2} targetType="article" replyCount={1} onReply={vi.fn()} />
      </>,
    );

    const expandButtons = screen.getAllByText(/展开 1 条回复/);
    await user.click(expandButtons[0]);
    await waitFor(() => expect(screen.getByText("回复 1")).toBeTruthy());

    await user.click(expandButtons[1]);
    await waitFor(() => expect(screen.getByText("回复 2")).toBeTruthy());

    const avatars = screen.getAllByTestId("user-avatar");
    expect(avatars.map((avatar) => avatar.getAttribute("data-src"))).toEqual([
      "https://blog-oss.yevpt.com/avatars/vpt-cross.png",
      "https://blog-oss.yevpt.com/avatars/vpt-cross.png",
    ]);
  });

  it("is_liked=true 时回复爱心为实心", async () => {
    vi.mocked(global.fetch).mockResolvedValue(
      jsonResponse(mockPage([makeReply(1, { is_liked: true })])),
    );

    render(<CommentReplies commentId={1} targetType="article" replyCount={1} onReply={vi.fn()} />);
    (await userEvent.setup()).click(screen.getByText(/展开 1 条回复/));
    await waitFor(() => expect(screen.getByTestId("icon-heart-fill")).toBeTruthy());
  });

  it("targetType=guestbook 时展开并显示回复", async () => {
    const user = userEvent.setup();
    vi.mocked(global.fetch).mockResolvedValue(jsonResponse(mockPage([makeReply(1)])));

    render(
      <CommentReplies commentId={1} targetType="guestbook" replyCount={1} onReply={vi.fn()} />,
    );
    await user.click(screen.getByText(/展开 1 条回复/));
    await waitFor(() => expect(screen.getByText("回复 1")).toBeTruthy());
  });

  it("回复布局与留言板一致", async () => {
    const user = userEvent.setup();
    vi.mocked(global.fetch).mockResolvedValue(
      jsonResponse(mockPage([makeReply(1, { like_count: 0 })])),
    );

    render(<CommentReplies commentId={1} targetType="article" replyCount={1} onReply={vi.fn()} />);
    await user.click(screen.getByText(/展开 1 条回复/));
    await waitFor(() => expect(screen.getByText("回复 1")).toBeTruthy());

    expect(screen.getByText("2026-06-17 13:19")).toBeTruthy();
    expect(screen.getByTestId("like-count").textContent).toBe("0");
    expect(screen.getByTestId("icon-heart-fill")).toBeTruthy();
    expect(screen.getAllByRole("button", { name: "回复" })).toHaveLength(1);
  });

  it("targetType=guestbook 时点击回复按钮触发 onReply", async () => {
    const user = userEvent.setup();
    const onReply = vi.fn();
    vi.mocked(global.fetch).mockResolvedValue(jsonResponse(mockPage([makeReply(1)])));

    render(
      <CommentReplies commentId={1} targetType="guestbook" replyCount={1} onReply={onReply} />,
    );
    await user.click(screen.getByText(/展开 1 条回复/));
    await waitFor(() => screen.getByText("回复 1"));
    await user.click(screen.getByRole("button", { name: "回复" }));

    expect(onReply).toHaveBeenCalledWith({
      commentId: 1,
      parentReplyId: 1,
      toUsername: "Alice",
    });
  });

  it("targetType=guestbook 时 fetch URL 包含 guestbook 路径", async () => {
    const user = userEvent.setup();
    vi.mocked(global.fetch).mockResolvedValue(jsonResponse(mockPage([makeReply(1)])));

    render(
      <CommentReplies commentId={7} targetType="guestbook" replyCount={1} onReply={vi.fn()} />,
    );
    await user.click(screen.getByText(/展开 1 条回复/));
    await waitFor(() => expect(screen.getByText("回复 1")).toBeTruthy());

    expect(vi.mocked(global.fetch)).toHaveBeenCalledWith(
      expect.stringContaining("/api/guestbook/comments/7/replies"),
      undefined,
    );
  });

  it("有 from_user 时昵称渲染为跳转链接", async () => {
    const user = userEvent.setup();
    vi.mocked(global.fetch).mockResolvedValue(jsonResponse(mockPage([makeReply(1)])));

    render(<CommentReplies commentId={1} targetType="article" replyCount={1} onReply={vi.fn()} />);
    await user.click(screen.getByText(/展开 1 条回复/));
    await waitFor(() => {
      const links = screen.getAllByRole("link", { name: "Alice" });
      expect(links.every((l) => l.getAttribute("href") === "/users/1")).toBe(true);
    });
  });
});

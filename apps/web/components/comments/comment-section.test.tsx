// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import type { CommentItemResp, CommentPageResp } from "@repo/api";
import { CommentSection } from "./comment-section";

vi.mock("@repo/icons", () => ({
  SvgIcon: ({ name }: { name: string }) => <span data-testid={`icon-${name}`} />,
}));
vi.mock("@repo/ui", () => ({
  Button: ({
    children,
    onPress,
    isDisabled,
    ...props
  }: {
    children: React.ReactNode;
    onPress?: () => void;
    isDisabled?: boolean;
    [key: string]: unknown;
  }) => (
    <button type="button" onClick={onPress} disabled={isDisabled} {...props}>
      {children}
    </button>
  ),
}));
vi.mock("@/app/providers/session-provider", () => ({
  useSession: () => ({ userId: 1 }),
}));
vi.mock("@/store/use-login-modal", () => ({
  useLoginModal: () => ({ open: vi.fn() }),
}));
vi.mock("./comment-replies", () => ({
  CommentReplies: () => null,
}));
vi.mock("./comment-item", () => ({
  CommentItem: ({ comment }: { comment: CommentItemResp }) => (
    <div data-testid="comment-item">{comment.content}</div>
  ),
}));

function makeComment(id: number, overrides?: Partial<CommentItemResp>): CommentItemResp {
  return {
    id,
    target_type: "article",
    target_id: 1,
    user_id: 1,
    content: `评论内容 ${id}`,
    user: { id: 1, username: "alice", nickname: "Alice" },
    reply_count: 0,
    like_count: 0,
    is_liked: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

function mockPage(list: CommentItemResp[], pages = 1): CommentPageResp {
  return { total: list.length, pages, page: 1, page_size: 10, list };
}

describe("CommentSection", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockPage([makeComment(1), makeComment(2)])),
    } as Response);
  });

  it("modal layout：加载并渲染评论列表", async () => {
    render(<CommentSection targetType="article" targetId={1} layout="modal" />);
    await waitFor(() => expect(screen.getByText("评论内容 1")).toBeTruthy());
    expect(screen.getByText("评论内容 2")).toBeTruthy();
  });

  it("inline layout：评论列表仍然渲染", async () => {
    render(<CommentSection targetType="article" targetId={1} layout="inline" />);
    await waitFor(() => expect(screen.getByText("评论内容 1")).toBeTruthy());
  });

  it("moment targetType 正常工作", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockPage([makeComment(1, { target_type: "moment" })])),
    } as Response);
    render(<CommentSection targetType="moment" targetId={5} />);
    await waitFor(() => expect(screen.getByText("评论内容 1")).toBeTruthy());
  });

  it("暂无评论时显示提示文案", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockPage([])),
    } as Response);
    render(<CommentSection targetType="article" targetId={1} />);
    await waitFor(() => expect(screen.getByText(/暂无评论/)).toBeTruthy());
  });

  it("hasMore 时显示「查看更多评论」按钮", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockPage([makeComment(1)], 3)),
    } as Response);

    render(<CommentSection targetType="article" targetId={1} />);
    await waitFor(() => expect(screen.getByText("查看更多评论")).toBeTruthy());
  });

  it("无更多时不显示「查看更多评论」", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockPage([makeComment(1)], 1)),
    } as Response);

    render(<CommentSection targetType="article" targetId={1} />);
    await waitFor(() => expect(screen.getByText("评论内容 1")).toBeTruthy());
    expect(screen.queryByText("查看更多评论")).toBeNull();
  });
});

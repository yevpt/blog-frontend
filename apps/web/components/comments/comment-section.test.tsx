import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import type { CommentPageResp } from "@repo/api";
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
    children: ReactNode;
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
  useSession: () => ({ user: { id: 1, username: "alice" } }),
}));

vi.mock("@/store/use-login-modal", () => ({
  useLoginModal: () => ({ open: vi.fn() }),
}));

function makePageResp(count: number, pages = 1): CommentPageResp {
  return {
    total: count,
    pages,
    page: 1,
    page_size: 10,
    list: Array.from({ length: count }, (_, index) => ({
      id: index + 1,
      target_type: "article",
      target_id: 1,
      user_id: 1,
      content: `评论 ${index + 1}`,
      user: { id: 1, username: "alice", nickname: "Alice" },
      replies: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })),
  };
}

describe("CommentSection", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    global.fetch = vi.fn();
  });

  it("加载完成后显示评论列表", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(makePageResp(2)),
    } as Response);

    render(<CommentSection targetType="article" targetId={1} />);
    await waitFor(() => expect(screen.getByText("评论 1")).toBeTruthy());
    expect(screen.getByText("评论 2")).toBeTruthy();
  });

  it("无评论时显示空状态提示", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(makePageResp(0)),
    } as Response);

    render(<CommentSection targetType="article" targetId={1} />);
    await waitFor(() => expect(screen.getByText("暂无评论，来发表第一条吧")).toBeTruthy());
  });

  it("hasMore 时显示「查看更多评论」按钮", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(makePageResp(1, 2)),
    } as Response);

    render(<CommentSection targetType="article" targetId={1} />);
    await waitFor(() => expect(screen.getByText("查看更多评论")).toBeTruthy());
  });

  it("无更多时不显示「查看更多评论」", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(makePageResp(1, 1)),
    } as Response);

    render(<CommentSection targetType="article" targetId={1} />);
    await waitFor(() => expect(screen.getByText("评论 1")).toBeTruthy());
    expect(screen.queryByText("查看更多评论")).toBeNull();
  });

  it("点击回复触发 CommentInput 回复模式", async () => {
    const user = userEvent.setup();
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(makePageResp(1)),
    } as Response);

    render(<CommentSection targetType="article" targetId={1} />);
    await waitFor(() => screen.getByText("评论 1"));

    await user.click(screen.getByText("回复"));
    expect(screen.getByText("@Alice")).toBeTruthy();
    expect(screen.getByText("取消")).toBeTruthy();
  });
});

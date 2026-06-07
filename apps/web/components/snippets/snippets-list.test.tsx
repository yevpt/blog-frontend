import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import type { MomentPageResp } from "@repo/api";
import { SnippetsList } from "./snippets-list";

const mockOpenLoginModal = vi.fn();
let mockSessionUserId: number | null = 7;

vi.mock("@repo/icons", () => ({
  SvgIcon: ({ name }: { name: string }) => <span data-testid={`icon-${name}`} />,
}));

vi.mock("@repo/ui", () => ({
  cn: (...classes: Array<string | false | null | undefined>) => classes.filter(Boolean).join(" "),
  Button: ({
    children,
    onPress,
    ...props
  }: {
    children: ReactNode;
    onPress?: () => void;
    [key: string]: unknown;
  }) => (
    <button onClick={onPress} {...props}>
      {children}
    </button>
  ),
  Pagination: ({
    currentPage,
    totalPages,
    onPageChange,
  }: {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
  }) => (
    <nav aria-label="分页导航">
      <button aria-label="下一页" onClick={() => onPageChange(currentPage + 1)}>
        下一页
      </button>
      <span>
        {currentPage}/{totalPages}
      </span>
    </nav>
  ),
}));

vi.mock("@/app/providers/session-provider", () => ({
  useSession: () => ({ userId: mockSessionUserId, profile: null }),
}));

vi.mock("@/store/use-login-modal", () => ({
  useLoginModal: () => ({ open: mockOpenLoginModal }),
}));

vi.mock("@/lib/toast", () => ({
  addToast: vi.fn(),
}));

vi.mock("@/components/comments", () => ({
  CommentModal: ({ targetId, targetType }: { targetId: number; targetType: string }) => (
    <div
      data-testid="comment-modal"
      data-target-id={String(targetId)}
      data-target-type={targetType}
    />
  ),
}));

vi.mock("./snippet-card", () => ({
  SnippetCard: ({
    snippet,
    onComment,
  }: {
    snippet: { id: number; content: string };
    onComment?: (snippet: { id: number; content: string }) => void;
  }) => (
    <div data-testid="snippet-card">
      <span>{snippet.content}</span>
      <button aria-label="评论" onClick={() => onComment?.(snippet)}>
        评论
      </button>
    </div>
  ),
}));

function makePageResp(overrides: Partial<MomentPageResp> = {}): MomentPageResp {
  return {
    total: 1,
    pages: 1,
    page: 1,
    page_size: 20,
    list: [
      {
        id: 1,
        user_id: 1,
        content: "列表碎语",
        status: 1,
        comment_status: 1,
        read_count: 0,
        is_top: false,
        like_count: 2,
        comment_count: 1,
        is_liked: false,
        images: [],
        created_at: "2026-05-30T09:00:00Z",
        updated_at: "2026-05-30T09:00:00Z",
      },
    ],
    ...overrides,
  };
}

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
  mockSessionUserId = 7;
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("SnippetsList", () => {
  it("渲染碎语列表", () => {
    render(<SnippetsList initialPage={makePageResp()} />);
    expect(screen.getByText("列表碎语")).toBeTruthy();
  });

  it("无数据时显示空状态", () => {
    render(<SnippetsList initialPage={makePageResp({ list: [], total: 0 })} />);
    expect(screen.getByText("暂无碎语")).toBeTruthy();
  });

  it("点击评论打开 moment 弹窗", async () => {
    const user = userEvent.setup();
    render(<SnippetsList initialPage={makePageResp()} />);

    await user.click(screen.getByLabelText("评论"));

    const modal = screen.getByTestId("comment-modal");
    expect(modal.dataset.targetId).toBe("1");
    expect(modal.dataset.targetType).toBe("moment");
  });

  it("pages > 1 时显示分页", async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () =>
        makePageResp({
          page: 2,
          list: [
            {
              ...makePageResp().list[0],
              id: 2,
              content: "第二页碎语",
            },
          ],
        }),
    } as Response);

    render(<SnippetsList initialPage={makePageResp({ total: 40, pages: 2 })} />);

    await user.click(screen.getByRole("button", { name: "下一页" }));

    await waitFor(() => {
      expect(screen.getByText("第二页碎语")).toBeTruthy();
    });
  });
});

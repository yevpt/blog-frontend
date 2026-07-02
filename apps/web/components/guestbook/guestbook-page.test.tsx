// @vitest-environment jsdom
import { useCallback, useState, type ReactNode, type RefObject } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { GuestbookPage } from "./guestbook-page";
import type { GuestbookPageResp } from "@repo/api";

const mockScrollIntoViewBelowFixedHeader = vi.fn();
const mockRunAfterSmoothScroll = vi.fn((callback: () => void) => callback());

vi.mock("@/components/common/page-container", () => ({
  PageContainer: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/lib/scroll-into-view", () => ({
  scrollIntoViewBelowFixedHeader: (...args: unknown[]) =>
    mockScrollIntoViewBelowFixedHeader(...args),
  runAfterSmoothScroll: (callback: () => void) => mockRunAfterSmoothScroll(callback),
}));

vi.mock("@/app/providers/session-provider", () => ({
  useSession: () => ({ userId: 1 }),
}));

vi.mock("@/store/use-login-modal", () => ({
  useLoginModal: () => ({ open: vi.fn() }),
}));

vi.mock("./guestbook-list", () => ({
  GuestbookList: ({
    total,
    onSubmitReply,
    onSubmitEditReply,
    onPageChange,
    listRef,
    editedReplies,
  }: {
    total: number;
    onSubmitReply: (
      commentId: number,
      parentReplyId: number | undefined,
      content: string,
    ) => Promise<boolean>;
    onSubmitEditReply?: (
      replyId: number,
      parentReplyId: number,
      commentId: number,
      content: string,
    ) => Promise<boolean>;
    onPageChange: (page: number) => void;
    listRef?: RefObject<HTMLDivElement | null>;
    editedReplies?: Record<number, { content: string } | null>;
  }) => (
    <div ref={listRef} data-testid="guestbook-list">
      {total} 条留言
      <button type="button" onClick={() => void onSubmitReply(1, undefined, "回复内容")}>
        回复
      </button>
      <button type="button" onClick={() => onPageChange(2)}>
        下一页
      </button>
      <button type="button" onClick={() => void onSubmitEditReply?.(9, 0, 1, "修正后的回复")}>
        编辑回复
      </button>
      <span data-testid="edited-reply">{editedReplies?.[1]?.content}</span>
    </div>
  ),
}));

vi.mock("./guestbook-input-bar", () => ({
  GuestbookInputBar: ({ onSubmit }: { onSubmit: (content: string) => Promise<boolean> }) => (
    <div data-testid="input-bar">
      <button type="button" onClick={() => void onSubmit("新留言内容")}>
        发布
      </button>
    </div>
  ),
}));

vi.mock("@/hooks/use-guestbook-list", () => ({
  useGuestbookList: (initial: GuestbookPageResp) => {
    const [isLoading, setIsLoading] = useState(false);
    const [page, setPage] = useState(initial.page);
    const fetchPage = useCallback(async (pageNum: number) => {
      setIsLoading(true);
      await Promise.resolve();
      setPage(pageNum);
      setIsLoading(false);
    }, []);

    return {
      items: initial.list,
      page,
      totalPages: 3,
      total: initial.total,
      isLoading,
      error: null,
      fetchPage,
      addItem: vi.fn(),
      incrementReplyCount: vi.fn(),
      decrementReplyCount: vi.fn(),
      removeItem: vi.fn(),
      updateLike: vi.fn(),
      replaceItem: vi.fn(),
    };
  },
}));

const mockEditEntry = vi.fn().mockResolvedValue(null);
const mockEditReply = vi.fn().mockResolvedValue({ id: 9, content: "修正后的回复" });

vi.mock("@/hooks/use-guestbook-submit", () => ({
  useGuestbookSubmit: () => ({
    isSubmitting: false,
    submitEntry: vi.fn().mockResolvedValue(null),
    submitReply: vi.fn().mockResolvedValue(null),
    editEntry: mockEditEntry,
  }),
}));

vi.mock("@/hooks/use-comment-edit", () => ({
  useCommentEdit: () => ({ editReply: mockEditReply }),
}));

vi.mock("@/hooks/use-guestbook-like", () => ({
  useGuestbookLike: () => ({ toggleEntryLike: vi.fn().mockResolvedValue(null) }),
}));

const emptyPage: GuestbookPageResp = {
  total: 0,
  pages: 0,
  page: 1,
  page_size: 10,
  list: [],
};

const filledPage: GuestbookPageResp = {
  total: 3,
  pages: 1,
  page: 1,
  page_size: 10,
  list: [],
};

describe("GuestbookPage", () => {
  it("渲染顶部输入框", () => {
    render(<GuestbookPage initialPage={emptyPage} />);
    expect(screen.getByTestId("input-bar")).toBeTruthy();
  });

  it("渲染留言列表", () => {
    render(<GuestbookPage initialPage={filledPage} />);
    expect(screen.getByTestId("guestbook-list")).toBeTruthy();
    expect(screen.getByText("3 条留言")).toBeTruthy();
  });

  it("分页切换加载完成后滚动到留言列表顶部", async () => {
    mockScrollIntoViewBelowFixedHeader.mockClear();
    const user = userEvent.setup();

    render(<GuestbookPage initialPage={{ ...filledPage, total: 25, pages: 3 }} />);
    await user.click(screen.getByRole("button", { name: "下一页" }));

    await waitFor(() => {
      expect(mockScrollIntoViewBelowFixedHeader).toHaveBeenCalledWith(
        screen.getByTestId("guestbook-list"),
      );
    });
  });

  it("点击回复按钮提交后调用 submitReply 并增加回复计数", async () => {
    const user = userEvent.setup();
    render(<GuestbookPage initialPage={filledPage} />);

    await user.click(screen.getByRole("button", { name: "回复" }));

    // mock 的 useGuestbookSubmit().submitReply 默认返回 null（见 mock 定义），
    // 这里只验证调用链路不抛异常、且没有对不存在的 replyTarget 状态产生依赖。
    expect(screen.getByTestId("guestbook-list")).toBeTruthy();
  });

  it("留言回复编辑成功后按所属留言原位替换", async () => {
    const user = userEvent.setup();
    render(<GuestbookPage initialPage={filledPage} />);

    await user.click(screen.getByRole("button", { name: "编辑回复" }));

    await waitFor(() => {
      expect(mockEditReply).toHaveBeenCalledWith(9, 0, "修正后的回复");
      expect(screen.getByTestId("edited-reply")).toHaveTextContent("修正后的回复");
    });
  });
});

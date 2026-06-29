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
    onReply,
    onEditReply,
    onPageChange,
    listRef,
    editedReplies,
  }: {
    total: number;
    onReply: (target: { commentId: number; toUsername: string }) => void;
    onEditReply?: (target: {
      type: "reply";
      id: number;
      commentId: number;
      parentReplyId: number;
      initialContent: string;
      pendingReview?: boolean;
    }) => void;
    onPageChange: (page: number) => void;
    listRef?: RefObject<HTMLDivElement | null>;
    editedReplies?: Record<number, { content: string } | null>;
  }) => (
    <div ref={listRef} data-testid="guestbook-list">
      {total} 条留言
      <button type="button" onClick={() => onReply({ commentId: 1, toUsername: "Alice" })}>
        回复
      </button>
      <button type="button" onClick={() => onPageChange(2)}>
        下一页
      </button>
      <button
        type="button"
        onClick={() =>
          onEditReply?.({
            type: "reply",
            id: 9,
            commentId: 1,
            parentReplyId: 0,
            initialContent: "待审回复",
            pendingReview: true,
          })
        }
      >
        编辑回复
      </button>
      <span data-testid="edited-reply">{editedReplies?.[1]?.content}</span>
    </div>
  ),
}));

vi.mock("./guestbook-input-bar", () => ({
  GuestbookInputBar: ({
    onSubmit,
    editTarget,
  }: {
    onSubmit: (content: string) => Promise<boolean>;
    editTarget?: { initialContent: string } | null;
  }) => (
    <div data-testid="input-bar">
      <span data-testid="edit-value">{editTarget?.initialContent}</span>
      <button type="button" onClick={() => void onSubmit("修正后的回复")}>
        保存回复
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

  it("点击回复时滚动到编辑器", async () => {
    mockScrollIntoViewBelowFixedHeader.mockClear();
    mockRunAfterSmoothScroll.mockClear();

    render(<GuestbookPage initialPage={filledPage} />);
    await userEvent.click(screen.getByRole("button", { name: "回复" }));
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

    expect(mockScrollIntoViewBelowFixedHeader).toHaveBeenCalledTimes(1);
    expect(mockRunAfterSmoothScroll).toHaveBeenCalledTimes(1);
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

  it("留言回复编辑成功后按所属留言原位替换", async () => {
    const user = userEvent.setup();
    render(<GuestbookPage initialPage={filledPage} />);

    await user.click(screen.getByRole("button", { name: "编辑回复" }));
    expect(screen.getByTestId("edit-value")).toHaveTextContent("待审回复");
    await user.click(screen.getByRole("button", { name: "保存回复" }));

    await waitFor(() => {
      expect(mockEditReply).toHaveBeenCalledWith(9, 0, "修正后的回复");
      expect(screen.getByTestId("edited-reply")).toHaveTextContent("修正后的回复");
    });
  });
});

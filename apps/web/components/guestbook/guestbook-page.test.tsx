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
    onPageChange,
    listRef,
  }: {
    total: number;
    onReply: (target: { commentId: number; toUsername: string }) => void;
    onPageChange: (page: number) => void;
    listRef?: RefObject<HTMLDivElement | null>;
  }) => (
    <div ref={listRef} data-testid="guestbook-list">
      {total} 条留言
      <button type="button" onClick={() => onReply({ commentId: 1, toUsername: "Alice" })}>
        回复
      </button>
      <button type="button" onClick={() => onPageChange(2)}>
        下一页
      </button>
    </div>
  ),
}));

vi.mock("./guestbook-input-bar", () => ({
  GuestbookInputBar: () => <div data-testid="input-bar" />,
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
    };
  },
}));

vi.mock("@/hooks/use-guestbook-submit", () => ({
  useGuestbookSubmit: () => ({
    isSubmitting: false,
    submitEntry: vi.fn().mockResolvedValue(null),
    submitReply: vi.fn().mockResolvedValue(null),
  }),
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
});

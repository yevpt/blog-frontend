// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { GuestbookPage } from "./guestbook-page";
import type { GuestbookPageResp } from "@repo/api";

vi.mock("@/app/providers/session-provider", () => ({
  useSession: () => ({ userId: 1 }),
}));

vi.mock("@/store/use-login-modal", () => ({
  useLoginModal: () => ({ open: vi.fn() }),
}));

vi.mock("./guestbook-list", () => ({
  GuestbookList: ({ total }: { total: number }) => (
    <div data-testid="guestbook-list">{total} 条留言</div>
  ),
}));

vi.mock("./guestbook-input-bar", () => ({
  GuestbookInputBar: () => <div data-testid="input-bar" />,
}));

vi.mock("@/hooks/use-guestbook-list", () => ({
  useGuestbookList: (initial: GuestbookPageResp) => ({
    items: initial.list,
    page: initial.page,
    totalPages: initial.pages,
    total: initial.total,
    isLoading: false,
    error: null,
    fetchPage: vi.fn(),
    addItem: vi.fn(),
    incrementReplyCount: vi.fn(),
    updateLike: vi.fn(),
  }),
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
});

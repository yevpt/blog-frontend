// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { GuestbookList } from "./guestbook-list";
import type { GuestbookItemResp } from "@repo/api";

vi.mock("@repo/ui", async (importOriginal) => {
  const actual = (await importOriginal()) as object;
  return {
    ...actual,
    Pagination: ({
      currentPage,
      totalPages: _totalPages,
      onPageChange,
    }: {
      currentPage: number;
      totalPages: number;
      onPageChange: (p: number) => void;
    }) => (
      <div data-testid="pagination">
        <button onClick={() => onPageChange(currentPage + 1)}>下一页</button>
      </div>
    ),
  };
});

vi.mock("@/components/guestbook/guestbook-item", () => ({
  GuestbookItem: ({ item }: { item: GuestbookItemResp }) => (
    <div data-testid="guestbook-item">{item.content}</div>
  ),
}));

const items: GuestbookItemResp[] = [
  {
    id: 1,
    owner_user_id: 0,
    from_user_id: 1,
    content: "第一条留言",
    reply_count: 0,
    like_count: 0,
    is_liked: false,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
];

describe("GuestbookList", () => {
  const defaultProps = {
    items,
    page: 1,
    totalPages: 1,
    total: 1,
    isLoading: false,
    error: null,
    onPageChange: vi.fn(),
    onReply: vi.fn(),
    onLike: vi.fn(),
    pendingReplies: {},
  };

  it("渲染留言条目", () => {
    render(<GuestbookList {...defaultProps} />);
    expect(screen.getByText("第一条留言")).toBeTruthy();
  });

  it("显示留言总数", () => {
    render(<GuestbookList {...defaultProps} total={42} />);
    expect(screen.getByText("42 条留言")).toBeTruthy();
  });

  it("totalPages > 1 时显示分页组件", () => {
    render(<GuestbookList {...defaultProps} totalPages={3} total={25} />);
    expect(screen.getByTestId("pagination")).toBeTruthy();
  });

  it("totalPages <= 1 时不显示分页组件", () => {
    render(<GuestbookList {...defaultProps} totalPages={1} total={5} />);
    expect(screen.queryByTestId("pagination")).toBeNull();
  });

  it("空列表时显示提示文字", () => {
    render(<GuestbookList {...defaultProps} items={[]} total={0} />);
    expect(screen.getByText(/还没有留言/)).toBeTruthy();
  });

  it("isLoading=true 且空列表时显示加载态", () => {
    render(<GuestbookList {...defaultProps} items={[]} isLoading={true} />);
    expect(screen.getByLabelText("加载中")).toBeTruthy();
  });

  it("error 时显示错误信息", () => {
    render(<GuestbookList {...defaultProps} items={[]} error="加载失败" />);
    expect(screen.getByText("加载失败")).toBeTruthy();
  });

  it("翻页时调用 onPageChange", async () => {
    const onPageChange = vi.fn();
    render(
      <GuestbookList {...defaultProps} totalPages={3} total={25} onPageChange={onPageChange} />,
    );
    await userEvent.click(screen.getByText("下一页"));
    expect(onPageChange).toHaveBeenCalledWith(2);
  });
});

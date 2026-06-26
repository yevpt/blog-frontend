import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastRegion } from "@repo/ui";
import { apiClient } from "../../lib/api";
import { toastQueue } from "../../lib/toast";
import { useIsMdScreen } from "../tags/hooks/use-is-md-screen";
import { GuestbookPage } from "./GuestbookPage";
import { useAdminGuestbookList } from "./hooks/use-admin-guestbook-list";
import type { GuestbookRow } from "./model";

const mockRows: GuestbookRow[] = [
  {
    id: "9",
    ownerUserId: 1,
    fromUserId: 7,
    authorName: "vpt",
    content: "你好",
    replyCount: 2,
    likeCount: 3,
    createdAt: "2026/06/26 16:00",
  },
];

const mockRefetch = vi.fn();
const mockSetSearch = vi.fn();
const mockSetPage = vi.fn();

vi.mock("./hooks/use-admin-guestbook-list", () => ({
  useAdminGuestbookList: vi.fn(),
}));

vi.mock("../tags/hooks/use-is-md-screen", () => ({
  useIsMdScreen: vi.fn(() => true),
}));

vi.mock("../../lib/api", () => ({
  apiClient: {
    guestbook: {
      delete: vi.fn(),
    },
  },
}));

function renderGuestbookPage() {
  return render(
    <>
      <GuestbookPage />
      <ToastRegion queue={toastQueue} />
    </>,
  );
}

describe("GuestbookPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    toastQueue.clear();
    mockRefetch.mockResolvedValue(undefined);
    vi.mocked(apiClient.guestbook.delete).mockResolvedValue({ id: 9 });
    vi.mocked(useAdminGuestbookList).mockReturnValue({
      rows: mockRows,
      pageData: { total: 1, pages: 1, page: 1, page_size: 10, list: [] },
      isLoading: false,
      error: null,
      page: 1,
      setPage: mockSetPage,
      filters: { search: "" },
      setSearch: mockSetSearch,
      refetch: mockRefetch,
    });
  });

  it("渲染留言表格与标题", () => {
    renderGuestbookPage();

    expect(screen.getByRole("heading", { name: "留言管理" })).toBeInTheDocument();
    expect(screen.getByText("你好")).toBeInTheDocument();
    expect(screen.getByText("vpt")).toBeInTheDocument();
  });

  it("移动端列表容器限制在视口宽度内", () => {
    vi.mocked(useIsMdScreen).mockReturnValue(false);

    renderGuestbookPage();

    expect(screen.getByRole("region", { name: "留言列表" })).toHaveClass("min-w-0", "max-w-full");
  });

  it("点击删除留言后调用删除接口并刷新", async () => {
    const user = userEvent.setup();
    renderGuestbookPage();

    await user.click(screen.getByRole("button", { name: "删除" }));
    await user.click(await screen.findByRole("button", { name: "确认删除" }));

    await waitFor(() => {
      expect(apiClient.guestbook.delete).toHaveBeenCalledWith(9);
    });
    expect(mockRefetch).toHaveBeenCalled();
  });

  it("加载失败时显示错误信息", () => {
    vi.mocked(useAdminGuestbookList).mockReturnValue({
      rows: [],
      pageData: null,
      isLoading: false,
      error: new Error("加载留言失败"),
      page: 1,
      setPage: mockSetPage,
      filters: { search: "" },
      setSearch: mockSetSearch,
      refetch: mockRefetch,
    });

    renderGuestbookPage();

    expect(screen.getByRole("alert")).toHaveTextContent("加载留言失败");
  });
});

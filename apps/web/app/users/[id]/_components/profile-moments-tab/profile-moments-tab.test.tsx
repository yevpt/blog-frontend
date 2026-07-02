import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { MomentPageResp } from "@repo/api";
import { ProfileMomentsTab } from "./profile-moments-tab";

vi.mock("./profile-moments-virtual-list", () => ({
  ProfileMomentsVirtualList: ({
    items,
    onComment,
  }: {
    items: Array<{ id: number; content: string }>;
    onComment?: (item: { id: number; content: string }) => void;
  }) => (
    <div data-testid="profile-moments-virtual-list">
      {items.map((item) => (
        <button key={item.id} aria-label="评论" onClick={() => onComment?.(item)}>
          {item.content}
        </button>
      ))}
    </div>
  ),
}));

vi.mock("@/store/use-moment-modal", () => ({
  useMomentModal: (selector: (state: { open: () => void }) => unknown) =>
    selector({ open: vi.fn() }),
}));

const mockOpenCommentModal = vi.fn();

vi.mock("@/store/use-comment-modal", () => ({
  useCommentModal: (selector?: (state: { open: typeof mockOpenCommentModal }) => unknown) => {
    const state = { open: mockOpenCommentModal };
    return selector ? selector(state) : state;
  },
}));

const mockUseMomentList = vi.fn();

vi.mock("@/hooks/use-moment-list", () => ({
  useMomentList: (...args: unknown[]) => mockUseMomentList(...args),
}));

const emptyPage: MomentPageResp = {
  total: 0,
  pages: 0,
  page: 1,
  page_size: 10,
  list: [],
};

describe("ProfileMomentsTab", () => {
  beforeEach(() => {
    mockUseMomentList.mockReset();
    mockOpenCommentModal.mockClear();
  });

  it("首屏加载时展示骨架屏", () => {
    mockUseMomentList.mockReturnValue({
      moments: [],
      pageData: emptyPage,
      isLoadingInitial: true,
      isLoadingMore: false,
      endReached: true,
      fetchError: false,
      pendingLikeIds: new Set(),
      pendingActionIds: new Set(),
      loadMore: vi.fn(),
      toggleLike: vi.fn(),
      updateMoment: vi.fn(),
      toggleTop: vi.fn(),
      deleteMoment: vi.fn(),
      setMoments: vi.fn(),
    });

    render(<ProfileMomentsTab userId={1} isOwner={false} />);

    expect(screen.getByTestId("profile-moments-skeleton")).toBeInTheDocument();
    expect(screen.queryByText("暂无碎语")).not.toBeInTheDocument();
  });

  it("无碎语时显示空态", () => {
    mockUseMomentList.mockReturnValue({
      moments: [],
      pageData: emptyPage,
      isLoadingInitial: false,
      isLoadingMore: false,
      endReached: true,
      fetchError: false,
      pendingLikeIds: new Set(),
      pendingActionIds: new Set(),
      loadMore: vi.fn(),
      toggleLike: vi.fn(),
      updateMoment: vi.fn(),
      toggleTop: vi.fn(),
      deleteMoment: vi.fn(),
      setMoments: vi.fn(),
    });

    render(<ProfileMomentsTab userId={1} isOwner={false} />);

    expect(screen.getByText("暂无碎语")).toBeInTheDocument();
    expect(screen.getByText("TA 还没有发布过碎语")).toBeInTheDocument();
  });

  it("有碎语时渲染虚拟列表", () => {
    mockUseMomentList.mockReturnValue({
      moments: [{ id: 1 }],
      pageData: { ...emptyPage, total: 1, list: [{ id: 1 }] },
      isLoadingInitial: false,
      isLoadingMore: false,
      endReached: true,
      fetchError: false,
      pendingLikeIds: new Set(),
      pendingActionIds: new Set(),
      loadMore: vi.fn(),
      toggleLike: vi.fn(),
      updateMoment: vi.fn(),
      toggleTop: vi.fn(),
      deleteMoment: vi.fn(),
      setMoments: vi.fn(),
    });

    render(<ProfileMomentsTab userId={1} isOwner onTotalChange={vi.fn()} />);

    expect(screen.getByTestId("profile-moments-virtual-list")).toBeInTheDocument();
    expect(mockUseMomentList).toHaveBeenCalledWith(
      expect.objectContaining({ mode: "user", userId: 1 }),
    );
  });

  it("首屏加载中不同步 Tab 计数，避免覆盖 SSR 初始值", () => {
    const onTotalChange = vi.fn();
    mockUseMomentList.mockReturnValue({
      moments: [],
      pageData: emptyPage,
      isLoadingInitial: true,
      isLoadingMore: false,
      endReached: true,
      fetchError: false,
      pendingLikeIds: new Set(),
      pendingActionIds: new Set(),
      loadMore: vi.fn(),
      toggleLike: vi.fn(),
      updateMoment: vi.fn(),
      toggleTop: vi.fn(),
      deleteMoment: vi.fn(),
      setMoments: vi.fn(),
    });

    render(<ProfileMomentsTab userId={1} isOwner onTotalChange={onTotalChange} />);

    expect(onTotalChange).not.toHaveBeenCalled();
  });

  it("total 变化时通知父组件", () => {
    const onTotalChange = vi.fn();
    mockUseMomentList.mockReturnValue({
      moments: [{ id: 1 }],
      pageData: { ...emptyPage, total: 5 },
      isLoadingInitial: false,
      isLoadingMore: false,
      endReached: true,
      fetchError: false,
      pendingLikeIds: new Set(),
      pendingActionIds: new Set(),
      loadMore: vi.fn(),
      toggleLike: vi.fn(),
      updateMoment: vi.fn(),
      toggleTop: vi.fn(),
      deleteMoment: vi.fn(),
      setMoments: vi.fn(),
    });

    render(<ProfileMomentsTab userId={1} isOwner onTotalChange={onTotalChange} />);

    expect(onTotalChange).toHaveBeenCalledWith(5);
  });

  it("点击评论后调用 useCommentModal.open 并传入正确的 momentId", async () => {
    const user = userEvent.setup();
    const moment = {
      id: 7,
      user_id: 1,
      content: "个人页碎语",
      status: 1 as const,
      comment_status: 1 as const,
      read_count: 0,
      is_top: false,
      like_count: 0,
      comment_count: 0,
      is_liked: false,
      images: [],
      created_at: "2026-05-30T09:00:00Z",
      updated_at: "2026-05-30T09:00:00Z",
    };
    mockUseMomentList.mockReturnValue({
      moments: [moment],
      pageData: { total: 1, pages: 1, page: 1, page_size: 10, list: [moment] },
      isLoadingInitial: false,
      isLoadingMore: false,
      endReached: true,
      fetchError: false,
      pendingLikeIds: new Set(),
      pendingActionIds: new Set(),
      loadMore: vi.fn(),
      toggleLike: vi.fn(),
      updateMoment: vi.fn(),
      toggleTop: vi.fn(),
      deleteMoment: vi.fn(),
      setMoments: vi.fn(),
    });

    render(<ProfileMomentsTab userId={1} isOwner={false} />);

    await user.click(screen.getByLabelText("评论"));

    expect(mockOpenCommentModal).toHaveBeenCalledWith("moment", 7, expect.any(Function));
  });
});

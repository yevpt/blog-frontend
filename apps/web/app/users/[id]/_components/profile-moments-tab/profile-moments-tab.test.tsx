import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import type { MomentPageResp } from "@repo/api";
import { ProfileMomentsTab } from "./profile-moments-tab";

vi.mock("./profile-moments-virtual-list", () => ({
  ProfileMomentsVirtualList: () => <div data-testid="profile-moments-virtual-list" />,
}));

vi.mock("@/store/use-moment-modal", () => ({
  useMomentModal: (selector: (state: { open: () => void }) => unknown) =>
    selector({ open: vi.fn() }),
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
  });

  it("无碎语时显示空态", () => {
    mockUseMomentList.mockReturnValue({
      moments: [],
      pageData: emptyPage,
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

    render(<ProfileMomentsTab userId={1} isOwner={false} initialPage={emptyPage} />);

    expect(screen.getByText("暂无碎语")).toBeInTheDocument();
    expect(screen.getByText("TA 还没有发布过碎语")).toBeInTheDocument();
  });

  it("有碎语时渲染虚拟列表", () => {
    mockUseMomentList.mockReturnValue({
      moments: [{ id: 1 }],
      pageData: { ...emptyPage, total: 1, list: [{ id: 1 }] },
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

    render(
      <ProfileMomentsTab userId={1} isOwner initialPage={emptyPage} onTotalChange={vi.fn()} />,
    );

    expect(screen.getByTestId("profile-moments-virtual-list")).toBeInTheDocument();
    expect(mockUseMomentList).toHaveBeenCalledWith(
      expect.objectContaining({ mode: "user", userId: 1 }),
    );
  });

  it("total 变化时通知父组件", () => {
    const onTotalChange = vi.fn();
    mockUseMomentList.mockReturnValue({
      moments: [{ id: 1 }],
      pageData: { ...emptyPage, total: 5 },
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

    render(
      <ProfileMomentsTab
        userId={1}
        isOwner
        initialPage={emptyPage}
        onTotalChange={onTotalChange}
      />,
    );

    expect(onTotalChange).toHaveBeenCalledWith(5);
  });
});

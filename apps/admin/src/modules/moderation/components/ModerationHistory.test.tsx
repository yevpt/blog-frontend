import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import type { AdminModerationHistoryResp } from "@repo/api";
import { ModerationHistory } from "./ModerationHistory";
import { apiClient } from "../../../lib/api";

beforeAll(() => {
  if (!HTMLElement.prototype.getAnimations) {
    HTMLElement.prototype.getAnimations = () => [];
  }
});

vi.mock("../../../lib/api", () => ({
  apiClient: {
    moderation: {
      getHistory: vi.fn(),
    },
  },
}));

vi.mock("@repo/icons", () => ({
  SvgIcon: ({ name }: { name: string }) => <span data-testid={`icon-${name}`} />,
}));

vi.mock("@repo/ui", () => ({
  cn: (...c: Array<string | false | null | undefined>) => c.filter(Boolean).join(" "),
  Badge: ({ children, variant }: { children: React.ReactNode; variant?: string }) => (
    <span data-variant={variant}>{children}</span>
  ),
  Button: ({ children, onPress }: { children: React.ReactNode; onPress?: () => void }) => (
    <button onClick={onPress}>{children}</button>
  ),
}));

const mockHistoryResp: AdminModerationHistoryResp = {
  total: 2,
  page: 1,
  page_size: 20,
  list: [
    {
      item_id: 100,
      subject: { type: "moment", id: 9 },
      author_id: 42,
      lock_version: 3,
      lifecycle_state: "active",
      public_state: "visible",
      revision_id: 200,
      revision_version: 1,
      submitted_content: "第一版提交内容",
      published_content: "第一版发布内容",
      risk_level: "medium",
      policy_action: "post_review",
      review_status: "superseded",
      can_interact: true,
      images: [
        {
          object_key: "moderation/history/moments/100/photo.jpg",
          access_url: "https://cdn.example.com/moderation/history/moments/1/photo.jpg",
          display_mode: "visible",
          media_type: "image/jpeg",
          is_gif: false,
          seq: 0,
        },
      ],
      created_at: "2026-06-29T08:00:00Z",
    },
    {
      item_id: 100,
      subject: { type: "moment", id: 9 },
      author_id: 42,
      lock_version: 3,
      lifecycle_state: "active",
      public_state: "visible",
      revision_id: 201,
      revision_version: 2,
      submitted_content: "第二版提交内容",
      published_content: "第二版发布内容",
      risk_level: "low",
      policy_action: "auto_approve",
      review_status: "approved",
      can_interact: true,
      images: [],
      created_at: "2026-06-29T09:00:00Z",
      reviewed_at: "2026-06-29T10:00:00Z",
    },
  ],
  events: [
    {
      id: 1,
      revision_id: 200,
      actor_user_id: 42,
      action: "submit",
      created_at: "2026-06-29T08:00:00Z",
    },
    {
      id: 2,
      revision_id: 201,
      actor_user_id: 1,
      action: "approve",
      reason: "内容合规",
      created_at: "2026-06-29T10:00:00Z",
    },
    {
      id: 3,
      actor_user_id: 1,
      action: "emergency_hide",
      reason: "紧急处置",
      created_at: "2026-06-29T11:00:00Z",
    },
  ],
};

function renderHistory(itemId: number, open = true) {
  return render(
    <MemoryRouter>
      <ModerationHistory itemId={itemId} open={open} activeTab="history" />
    </MemoryRouter>,
  );
}

describe("ModerationHistory", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("加载时显示 加载中...", async () => {
    vi.mocked(apiClient.moderation.getHistory).mockImplementation(
      () => new Promise(() => undefined),
    );

    renderHistory(100);

    expect(screen.getByText("加载中...")).toBeInTheDocument();
  });

  it('展示修订历史，superseded 显示"已被新版本替代"', async () => {
    vi.mocked(apiClient.moderation.getHistory).mockResolvedValue(mockHistoryResp);

    renderHistory(100);

    await waitFor(() => {
      expect(screen.queryByText("加载中...")).not.toBeInTheDocument();
    });

    // 第一个修订 superseded
    expect(screen.getByText("已被新版本替代")).toBeInTheDocument();
    // 第二个修订 approved
    expect(screen.getByText("已通过")).toBeInTheDocument();
    // 提交内容
    expect(screen.getByText("第一版提交内容")).toBeInTheDocument();
  });

  it("私有图片仅使用 access_url", async () => {
    vi.mocked(apiClient.moderation.getHistory).mockResolvedValue(mockHistoryResp);

    renderHistory(100);

    await waitFor(() => {
      expect(screen.queryByText("加载中...")).not.toBeInTheDocument();
    });

    const img = screen.getByRole("img", { hidden: true });
    // 确保使用 access_url 而非其他字段
    expect(img).toHaveAttribute(
      "src",
      "https://cdn.example.com/moderation/history/moments/1/photo.jpg",
    );
  });

  it("操作事件显示操作人和理由", async () => {
    vi.mocked(apiClient.moderation.getHistory).mockResolvedValue(mockHistoryResp);

    renderHistory(100);

    await waitFor(() => {
      expect(screen.queryByText("加载中...")).not.toBeInTheDocument();
    });

    expect(screen.getByText(/#42/)).toBeInTheDocument();
    expect(screen.getAllByText(/#1/)).toHaveLength(2);
    expect(screen.getByText("内容级操作记录")).toBeInTheDocument();
    expect(screen.getByText("紧急隐藏")).toBeInTheDocument();
    expect(screen.getByText(/内容合规/)).toBeInTheDocument();
  });

  it("open=false 时不加载", async () => {
    vi.mocked(apiClient.moderation.getHistory).mockResolvedValue(mockHistoryResp);

    renderHistory(100, false);

    await new Promise((r) => setTimeout(r, 20));
    expect(apiClient.moderation.getHistory).not.toHaveBeenCalled();
  });

  it("下一页按钮发起分页请求", async () => {
    const page2Resp = { ...mockHistoryResp, page: 2, total: 25 };
    vi.mocked(apiClient.moderation.getHistory)
      .mockResolvedValueOnce({ ...mockHistoryResp, total: 25 })
      .mockResolvedValueOnce(page2Resp);

    renderHistory(100);

    await waitFor(() => {
      expect(screen.queryByTestId("spinner")).not.toBeInTheDocument();
    });

    const nextBtn = screen.getByRole("button", { name: /下一页/ });
    await userEvent.click(nextBtn);

    await waitFor(() => {
      expect(apiClient.moderation.getHistory).toHaveBeenCalledWith(100, { page: 2 });
    });
  });
});

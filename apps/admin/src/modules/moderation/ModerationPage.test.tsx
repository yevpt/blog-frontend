import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { ApiError } from "@repo/api";
import { ToastRegion } from "@repo/ui";
import { ModerationPage } from "./ModerationPage";
import { apiClient } from "../../lib/api";
import { toastQueue } from "../../lib/toast";
import { useModerationControl } from "./hooks/use-moderation-control";
import { useModerationList } from "./hooks/use-moderation-list";
import { useModerationUser } from "./hooks/use-moderation-user";
import { useIsMdScreen } from "../tags/hooks/use-is-md-screen";
import type { ModerationRow } from "./model";

// react-aria Tabs 在 happy-dom 下会调用 element.getAnimations() 做共享元素过渡，
// happy-dom 未实现该 API，需在测试套件开始前安装空实现，避免点击 Tab 时抛错。
beforeAll(() => {
  if (!HTMLElement.prototype.getAnimations) {
    HTMLElement.prototype.getAnimations = () => [];
  }
});

const mockRows: ModerationRow[] = [
  {
    itemId: 100,
    authorId: 42,
    lockVersion: 3,
    revisionId: 200,
    revisionVersion: 2,
    lifecycleState: "active",
    publicState: "placeholder",
    reviewStatus: "pending",
    riskLevel: "medium",
    policyAction: "post_review",
    contentTypeLabel: "碎语",
    riskLabel: "中风险",
    policyLabel: "审后通过",
    reviewLabel: "待审核",
    publicStateLabel: "占位",
    summary: "新提交内容",
    submittedContent: "新提交内容",
    publishedContent: "已发布内容",
    createdAt: "2026/06/29 16:00",
  },
  {
    itemId: 101,
    authorId: 7,
    lockVersion: 1,
    revisionId: 201,
    revisionVersion: 1,
    lifecycleState: "deleted",
    publicState: "hidden",
    reviewStatus: "pending",
    riskLevel: "high",
    policyAction: "block",
    contentTypeLabel: "留言",
    riskLabel: "高风险",
    policyLabel: "阻断",
    reviewLabel: "待审核",
    publicStateLabel: "隐藏",
    summary: "已删除的留言",
    submittedContent: "已删除的留言",
    publishedContent: "",
    createdAt: "2026/06/29 15:00",
  },
];

const mockRefetch = vi.fn();
const mockSetPage = vi.fn();
const mockSetContentType = vi.fn();
const mockSetRiskLevel = vi.fn();
const mockSetReviewStatus = vi.fn();
const mockResetListQuery = vi.fn();

vi.mock("./hooks/use-moderation-list", () => ({
  useModerationList: vi.fn(),
}));

vi.mock("./hooks/use-moderation-control", () => ({
  useModerationControl: vi.fn(),
}));

vi.mock("./hooks/use-moderation-user", () => ({
  useModerationUser: vi.fn(),
}));

vi.mock("../tags/hooks/use-is-md-screen", () => ({
  useIsMdScreen: vi.fn(),
}));

vi.mock("../../lib/api", () => ({
  apiClient: {
    moderation: {
      approveItem: vi.fn(),
      rejectItem: vi.fn(),
      correctItem: vi.fn(),
      hideItem: vi.fn(),
      restoreItem: vi.fn(),
      getItem: vi.fn(),
    },
  },
}));

function setupListHook(overrides: Partial<ReturnType<typeof useModerationList>> = {}) {
  vi.mocked(useModerationList).mockReturnValue({
    rows: mockRows,
    pageData: { total: 2, page: 1, page_size: 10, list: [] },
    isLoading: false,
    error: null,
    page: 1,
    setPage: mockSetPage,
    filters: { contentType: "all", riskLevel: "all", reviewStatus: "pending" },
    setContentType: mockSetContentType,
    setRiskLevel: mockSetRiskLevel,
    setReviewStatus: mockSetReviewStatus,
    resetListQuery: mockResetListQuery,
    hasActiveListQuery: false,
    refetch: mockRefetch,
    ...overrides,
  });
}

function setupControlHook(overrides: Partial<ReturnType<typeof useModerationControl>> = {}) {
  vi.mocked(useModerationControl).mockReturnValue({
    control: {
      registration_mode: "open",
      publishing_mode: "open",
      reason: "",
      changed_at: "2026-06-29T08:00:00Z",
      lock_version: 5,
    },
    isLoading: false,
    isSaving: false,
    error: null,
    saveControl: vi.fn().mockResolvedValue(undefined),
    reload: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  });
}

function setupUserHook(overrides: Partial<ReturnType<typeof useModerationUser>> = {}) {
  vi.mocked(useModerationUser).mockReturnValue({
    profile: null,
    batch: null,
    isLoading: false,
    isSaving: false,
    error: null,
    loadProfile: vi.fn().mockResolvedValue(undefined),
    updateProfile: vi.fn().mockResolvedValue(undefined),
    muteUser: vi.fn().mockResolvedValue(undefined),
    banUser: vi.fn().mockResolvedValue(undefined),
    releaseUser: vi.fn().mockResolvedValue(undefined),
    hideContentBatch: vi.fn().mockResolvedValue(undefined),
    restoreContentBatch: vi.fn().mockResolvedValue(undefined),
    resetProfile: vi.fn(),
    ...overrides,
  });
}

function renderPage() {
  return render(
    <MemoryRouter>
      <ModerationPage />
      <ToastRegion queue={toastQueue} />
    </MemoryRouter>,
  );
}

describe("ModerationPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    toastQueue.clear();
    mockRefetch.mockResolvedValue(undefined);
    vi.mocked(useIsMdScreen).mockReturnValue(true);
    setupListHook();
    setupControlHook();
    setupUserHook();
    vi.mocked(apiClient.moderation.approveItem).mockResolvedValue({
      item_id: 100,
      subject: { type: "moment", id: 9 },
      author_id: 42,
      lock_version: 4,
      lifecycle_state: "active",
      public_state: "visible",
      revision_id: 200,
      revision_version: 2,
      submitted_content: "新提交内容",
      published_content: "新提交内容",
      risk_level: "medium",
      policy_action: "post_review",
      review_status: "approved",
      created_at: "2026-06-29T08:00:00Z",
      can_interact: true,
    });
    vi.mocked(apiClient.moderation.rejectItem).mockResolvedValue({
      item_id: 100,
      subject: { type: "moment", id: 9 },
      author_id: 42,
      lock_version: 4,
      lifecycle_state: "active",
      public_state: "placeholder",
      revision_id: 200,
      revision_version: 2,
      submitted_content: "新提交内容",
      published_content: "已发布内容",
      risk_level: "medium",
      policy_action: "post_review",
      review_status: "rejected",
      created_at: "2026-06-29T08:00:00Z",
      can_interact: true,
    });
    vi.mocked(apiClient.moderation.correctItem).mockResolvedValue({
      item_id: 100,
      subject: { type: "moment", id: 9 },
      author_id: 42,
      lock_version: 4,
      lifecycle_state: "active",
      public_state: "visible",
      revision_id: 200,
      revision_version: 2,
      submitted_content: "修正后内容",
      published_content: "修正后内容",
      risk_level: "low",
      policy_action: "post_review",
      review_status: "approved",
      created_at: "2026-06-29T08:00:00Z",
      can_interact: true,
    });
    vi.mocked(apiClient.moderation.hideItem).mockResolvedValue({
      item_id: 100,
      public_state: "emergency_hidden",
      lock_version: 5,
    });
    vi.mocked(apiClient.moderation.restoreItem).mockResolvedValue({
      item_id: 100,
      public_state: "visible",
      lock_version: 6,
    });
  });

  it("渲染审核队列表格与三个 Tab", () => {
    renderPage();

    expect(screen.getByRole("heading", { name: "内容审核" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "审核队列" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "全站控制" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "用户治理" })).toBeInTheDocument();
    expect(screen.getByRole("grid", { name: "审核队列" })).toBeInTheDocument();
    expect(
      within(screen.getByRole("grid", { name: "审核队列" })).getByText("碎语"),
    ).toBeInTheDocument();
  });

  it("加载失败时展示错误提示", () => {
    setupListHook({ error: new Error("加载审核列表失败"), rows: [] });

    renderPage();

    expect(screen.getByRole("alert")).toHaveTextContent("加载审核列表失败");
  });

  it("无审核项时展示空态", () => {
    setupListHook({ rows: [], pageData: { total: 0, page: 1, page_size: 10, list: [] } });

    renderPage();

    expect(screen.getByText("暂无待审核内容")).toBeInTheDocument();
  });

  it("有筛选但无匹配时展示筛选空态", () => {
    setupListHook({
      rows: [],
      pageData: { total: 0, page: 1, page_size: 10, list: [] },
      hasActiveListQuery: true,
    });

    renderPage();

    expect(screen.getByText("未找到匹配的审核项")).toBeInTheDocument();
  });

  it("移动端渲染卡片列表而非表格", () => {
    vi.mocked(useIsMdScreen).mockReturnValue(false);
    renderPage();

    expect(screen.queryByRole("grid", { name: "审核队列" })).not.toBeInTheDocument();
    expect(screen.getAllByText("碎语").length).toBeGreaterThan(0);
  });

  it("点击审核按钮打开审核弹窗并展示原始/公开版本", async () => {
    const user = userEvent.setup();
    renderPage();

    const table = screen.getByRole("grid", { name: "审核队列" });
    await user.click(within(table).getAllByRole("button", { name: "审核" })[0]);

    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("原始提交")).toBeInTheDocument();
    expect(within(dialog).getByText("新提交内容")).toBeInTheDocument();
    expect(within(dialog).getByText("当前公开版本")).toBeInTheDocument();
    expect(within(dialog).getByText("已发布内容")).toBeInTheDocument();
  });

  it("通过审核时携带 revision_id 与 lock_version", async () => {
    const user = userEvent.setup();
    renderPage();

    const table = screen.getByRole("grid", { name: "审核队列" });
    await user.click(within(table).getAllByRole("button", { name: "审核" })[0]);
    await user.click(screen.getByRole("button", { name: "确认通过" }));

    await waitFor(() => {
      expect(apiClient.moderation.approveItem).toHaveBeenCalledWith(100, {
        revision_id: 200,
        lock_version: 3,
        reason: "",
      });
    });
    expect(mockRefetch).toHaveBeenCalled();
  });

  it("驳回理由为空时不发请求", async () => {
    const user = userEvent.setup();
    renderPage();

    const table = screen.getByRole("grid", { name: "审核队列" });
    await user.click(within(table).getAllByRole("button", { name: "审核" })[0]);
    await user.click(screen.getByRole("button", { name: "驳回" }));
    await user.click(screen.getByRole("button", { name: "确认驳回" }));

    await waitFor(() => {
      expect(screen.getByText("驳回必须填写理由")).toBeInTheDocument();
    });
    expect(apiClient.moderation.rejectItem).not.toHaveBeenCalled();
  });

  it("填写理由后驳回携带 revision_id 与 lock_version", async () => {
    const user = userEvent.setup();
    renderPage();

    const table = screen.getByRole("grid", { name: "审核队列" });
    await user.click(within(table).getAllByRole("button", { name: "审核" })[0]);
    await user.click(screen.getByRole("button", { name: "驳回" }));
    await user.type(screen.getByLabelText("驳回理由"), "内容不当");
    await user.click(screen.getByRole("button", { name: "确认驳回" }));

    await waitFor(() => {
      expect(apiClient.moderation.rejectItem).toHaveBeenCalledWith(100, {
        revision_id: 200,
        lock_version: 3,
        reason: "内容不当",
      });
    });
  });

  it("修正正文或理由为空时不发请求", async () => {
    const user = userEvent.setup();
    renderPage();

    const table = screen.getByRole("grid", { name: "审核队列" });
    await user.click(within(table).getAllByRole("button", { name: "审核" })[0]);
    await user.click(screen.getByRole("button", { name: "修正" }));
    const contentBox = screen.getByLabelText("修正正文");
    await user.clear(contentBox);
    await user.click(screen.getByRole("button", { name: "保存修正" }));

    await waitFor(() => {
      expect(screen.getByText("修正正文不能为空")).toBeInTheDocument();
    });
    expect(apiClient.moderation.correctItem).not.toHaveBeenCalled();
  });

  it("修正成功携带 revision_id、lock_version、content、reason", async () => {
    const user = userEvent.setup();
    renderPage();

    const table = screen.getByRole("grid", { name: "审核队列" });
    await user.click(within(table).getAllByRole("button", { name: "审核" })[0]);
    await user.click(screen.getByRole("button", { name: "修正" }));
    const contentBox = screen.getByLabelText("修正正文");
    await user.clear(contentBox);
    await user.type(contentBox, "修正后的正文");
    await user.type(screen.getByLabelText("修正理由"), "去掉敏感词");
    await user.click(screen.getByRole("button", { name: "保存修正" }));

    await waitFor(() => {
      expect(apiClient.moderation.correctItem).toHaveBeenCalledWith(100, {
        revision_id: 200,
        lock_version: 3,
        content: "修正后的正文",
        reason: "去掉敏感词",
      });
    });
  });

  it("MODERATION_REVIEW_CONFLICT 时显示提示并刷新，不重放旧操作", async () => {
    vi.mocked(apiClient.moderation.approveItem).mockRejectedValue(
      new ApiError("MODERATION_REVIEW_CONFLICT", "审核状态已经变化"),
    );
    vi.mocked(apiClient.moderation.getItem).mockResolvedValue({
      item_id: 100,
      subject: { type: "moment", id: 9 },
      author_id: 42,
      lock_version: 9,
      lifecycle_state: "active",
      public_state: "visible",
      revision_id: 250,
      revision_version: 3,
      submitted_content: "已被他人审核",
      published_content: "已被他人审核",
      risk_level: "low",
      policy_action: "auto_approve",
      review_status: "approved",
      created_at: "2026-06-29T08:00:00Z",
      can_interact: true,
    });

    const user = userEvent.setup();
    renderPage();

    const table = screen.getByRole("grid", { name: "审核队列" });
    await user.click(within(table).getAllByRole("button", { name: "审核" })[0]);
    await user.click(screen.getByRole("button", { name: "确认通过" }));

    await waitFor(() => {
      expect(apiClient.moderation.getItem).toHaveBeenCalledWith(100);
    });
    expect(mockRefetch).toHaveBeenCalled();

    // 弹窗保持打开，显示冲突提示，且不重复 approve
    expect(apiClient.moderation.approveItem).toHaveBeenCalledTimes(1);
    await waitFor(() => {
      expect(screen.getByText(/审核状态已经变化/)).toBeInTheDocument();
    });
  });

  it("deleted item 不展示审核/恢复操作", async () => {
    const user = userEvent.setup();
    renderPage();

    const table = screen.getByRole("grid", { name: "审核队列" });
    await user.click(within(table).getAllByRole("button", { name: "审核" })[1]);

    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText(/已被删除，无法审核或恢复/)).toBeInTheDocument();
    // 没有审核操作按钮组
    expect(within(dialog).queryByRole("button", { name: "通过" })).not.toBeInTheDocument();
    expect(within(dialog).queryByRole("button", { name: "驳回" })).not.toBeInTheDocument();
    expect(within(dialog).queryByRole("button", { name: "修正" })).not.toBeInTheDocument();
  });

  it("已审核 item 只允许紧急处置，不再提供通过、驳回和修正", async () => {
    const reviewed = {
      ...mockRows[0]!,
      reviewStatus: "approved" as const,
      reviewLabel: "已通过",
      publicState: "visible" as const,
      publicStateLabel: "公开",
    };
    setupListHook({ rows: [reviewed], pageData: { total: 1, page: 1, page_size: 10, list: [] } });
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("button", { name: "审核" }));
    const dialog = screen.getByRole("dialog");

    expect(within(dialog).queryByRole("button", { name: "通过" })).toBeNull();
    expect(within(dialog).queryByRole("button", { name: "驳回" })).toBeNull();
    expect(within(dialog).queryByRole("button", { name: "修正" })).toBeNull();
    expect(within(dialog).getByRole("button", { name: "紧急隐藏" })).toBeInTheDocument();
  });

  it("全站控制 Tab 展示当前控制并支持保存", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("tab", { name: "全站控制" }));

    expect(screen.getByText("全站注册与发布控制")).toBeInTheDocument();
    expect(screen.getByText(/lock_version 5/)).toBeInTheDocument();
  });

  it("用户治理 Tab 输入 ID 查询画像", async () => {
    const mockLoad = vi.fn().mockResolvedValue(undefined);
    setupUserHook({ loadProfile: mockLoad });
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("tab", { name: "用户治理" }));
    await user.type(screen.getByLabelText("用户 ID"), "42");
    await user.click(screen.getByRole("button", { name: "查询画像" }));

    await waitFor(() => {
      expect(mockLoad).toHaveBeenCalledWith(42);
    });
  });

  it("工具栏渲染三个筛选下拉并有激活时的清除按钮", () => {
    setupListHook({ hasActiveListQuery: true });
    renderPage();

    // 三个筛选 Select 触发按钮以 aria-label 标记
    expect(screen.getByRole("button", { name: /筛选内容类型/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /筛选风险等级/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /筛选审核状态/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /清除筛选/ })).toBeInTheDocument();
  });

  it("无激活筛选时不展示清除按钮", () => {
    renderPage();

    expect(screen.queryByRole("button", { name: /清除筛选/ })).not.toBeInTheDocument();
  });
});

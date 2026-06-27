import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastRegion } from "@repo/ui";
import { TagsPage } from "./TagsPage";
import { toastQueue } from "../../lib/toast";
import { renderWithAdminRouter } from "../../test/render-with-admin-router";
import { useTagList } from "./hooks/use-tag-list";
import type { TagRow } from "./model";

const mockRows: TagRow[] = [
  {
    id: "1",
    name: "Go",
    url: "go",
    seq: 0,
    articleCount: 12,
  },
  {
    id: "2",
    name: "TypeScript",
    seq: 1,
    articleCount: 0,
  },
];

const mockRefetch = vi.fn();

vi.mock("./hooks/use-tag-list", () => ({
  useTagList: vi.fn(),
}));

vi.mock("../../lib/api", () => ({
  apiClient: {
    tags: {
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

function renderTagsPage() {
  return renderWithAdminRouter(
    <>
      <TagsPage />
      <ToastRegion queue={toastQueue} />
    </>,
  );
}

describe("TagsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    toastQueue.clear();
    mockRefetch.mockResolvedValue(undefined);
    vi.mocked(useTagList).mockReturnValue({
      rows: mockRows,
      items: [],
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });
  });

  it("渲染标签表格与标题", () => {
    renderTagsPage();

    expect(screen.getByRole("heading", { name: "标签管理" })).toBeInTheDocument();
    expect(screen.getByText("Go")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
  });

  it("空列表时显示空态", () => {
    vi.mocked(useTagList).mockReturnValue({
      rows: [],
      items: [],
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    renderTagsPage();

    expect(screen.getByText("还没有标签")).toBeInTheDocument();
  });

  it("加载失败时显示错误信息", () => {
    vi.mocked(useTagList).mockReturnValue({
      rows: [],
      items: [],
      isLoading: false,
      error: new Error("加载标签失败"),
      refetch: mockRefetch,
    });

    renderTagsPage();

    expect(screen.getByRole("alert")).toHaveTextContent("加载标签失败");
  });

  it("点击新建标签打开编辑抽屉", async () => {
    const user = userEvent.setup();
    renderTagsPage();

    await user.click(screen.getByRole("button", { name: /新建标签/i }));

    expect(await screen.findByRole("dialog", { name: "新建标签" })).toBeInTheDocument();
  });

  it("点击编辑打开编辑抽屉", async () => {
    const user = userEvent.setup();
    renderTagsPage();

    await user.click(screen.getAllByRole("button", { name: "编辑" })[0]!);

    expect(await screen.findByRole("dialog", { name: "编辑标签" })).toBeInTheDocument();
  });

  it("点击删除打开确认弹窗", async () => {
    const user = userEvent.setup();
    renderTagsPage();

    await user.click(screen.getAllByRole("button", { name: "删除" })[0]!);

    await waitFor(() => {
      expect(screen.getByText(/删除「Go」/)).toBeInTheDocument();
    });
  });
});

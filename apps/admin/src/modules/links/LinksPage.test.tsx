import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastRegion } from "@repo/ui";
import { LinksPage } from "./LinksPage";
import { toastQueue } from "../../lib/toast";
import { renderWithAdminRouter } from "../../test/render-with-admin-router";
import { useFriendLinkList } from "./hooks/use-friend-link-list";
import { useIsMdScreen } from "../tags/hooks/use-is-md-screen";
import type { FriendLinkRow } from "./model";

const mockRows: FriendLinkRow[] = [
  {
    id: "1",
    name: "VPT",
    site: "https://vpt.im",
    seq: 0,
    status: 1,
    updatedAt: "2026/06/01",
    avatarUrl: "https://cdn.example.com/logo.jpg",
  },
];

const mockRefetch = vi.fn();

vi.mock("./hooks/use-friend-link-list", () => ({
  useFriendLinkList: vi.fn(),
}));

vi.mock("../tags/hooks/use-is-md-screen", () => ({
  useIsMdScreen: vi.fn(() => true),
}));

vi.mock("../../lib/api", () => ({
  apiClient: {
    friendLinks: {
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

function renderLinksPage() {
  return renderWithAdminRouter(
    <>
      <LinksPage />
      <ToastRegion queue={toastQueue} />
    </>,
  );
}

describe("LinksPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    toastQueue.clear();
    mockRefetch.mockResolvedValue(undefined);
    vi.mocked(useFriendLinkList).mockReturnValue({
      rows: mockRows,
      items: [],
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });
  });

  it("渲染友链表格与标题", () => {
    renderLinksPage();

    expect(screen.getByRole("heading", { name: "友链管理" })).toBeInTheDocument();
    expect(screen.getByText("VPT")).toBeInTheDocument();
  });

  it("移动端列表容器限制在视口宽度内", () => {
    vi.mocked(useIsMdScreen).mockReturnValue(false);

    renderLinksPage();

    expect(screen.getByRole("region", { name: "友链列表" })).toHaveClass("min-w-0", "max-w-full");
  });

  it("空列表时显示空态", () => {
    vi.mocked(useFriendLinkList).mockReturnValue({
      rows: [],
      items: [],
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    renderLinksPage();

    expect(screen.getByText("还没有友链")).toBeInTheDocument();
  });

  it("点击新建友链打开表单", async () => {
    const user = userEvent.setup();
    renderLinksPage();

    await user.click(screen.getByRole("button", { name: /新建友链/i }));

    expect(await screen.findByRole("dialog", { name: "新建友链" })).toBeInTheDocument();
  });

  it("点击编辑打开编辑表单", async () => {
    const user = userEvent.setup();
    renderLinksPage();

    await user.click(screen.getAllByRole("button", { name: "编辑" })[0]!);

    expect(await screen.findByRole("dialog", { name: "编辑友链" })).toBeInTheDocument();
  });

  it("点击删除打开确认弹窗", async () => {
    const user = userEvent.setup();
    renderLinksPage();

    await user.click(screen.getAllByRole("button", { name: "删除" })[0]!);

    expect(await screen.findByRole("dialog", { name: /删除友链 VPT/i })).toBeInTheDocument();
  });

  it("加载失败时显示错误信息", () => {
    vi.mocked(useFriendLinkList).mockReturnValue({
      rows: [],
      items: [],
      isLoading: false,
      error: new Error("加载友链失败"),
      refetch: mockRefetch,
    });

    renderLinksPage();

    expect(screen.getByRole("alert")).toHaveTextContent("加载友链失败");
  });
});

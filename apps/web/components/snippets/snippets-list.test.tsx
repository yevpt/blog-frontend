import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import type { MomentPageResp } from "@repo/api";
import { SnippetsList } from "./snippets-list";

const mockOpenLoginModal = vi.fn();
let mockSessionUserId: number | null = 7;

vi.mock("@repo/icons", () => ({
  SvgIcon: ({ name }: { name: string }) => <span data-testid={`icon-${name}`} />,
}));

vi.mock("@repo/ui", () => ({
  cn: (...classes: Array<string | false | null | undefined>) => classes.filter(Boolean).join(" "),
  Button: ({
    children,
    onPress,
    ...props
  }: {
    children: ReactNode;
    onPress?: () => void;
    [key: string]: unknown;
  }) => (
    <button onClick={onPress} {...props}>
      {children}
    </button>
  ),
  Card: ({ children, ...props }: { children: ReactNode; [key: string]: unknown }) => (
    <div {...props}>{children}</div>
  ),
  Tabs: ({
    children,
    onSelectionChange,
  }: {
    children: ReactNode;
    selectedKey?: string;
    onSelectionChange?: (key: string) => void;
  }) => {
    const handleSelect = (e: { target: EventTarget | null }) => {
      const btn = (e.target as HTMLElement).closest("button[data-tab-id]");
      if (btn && onSelectionChange) {
        onSelectionChange(btn.getAttribute("data-tab-id") ?? "");
      }
    };
    return (
      <div role="presentation" onClick={handleSelect} onKeyDown={handleSelect}>
        {children}
      </div>
    );
  },
  TabsList: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  TabsItem: ({ children, id }: { children: ReactNode; id?: string; variant?: string }) => (
    <button data-tab-id={id}>{children}</button>
  ),
  Pagination: ({
    currentPage,
    totalPages,
    onPageChange,
  }: {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
  }) => (
    <nav aria-label="分页导航">
      <button aria-label="下一页" onClick={() => onPageChange(currentPage + 1)}>
        下一页
      </button>
      <span>
        {currentPage}/{totalPages}
      </span>
    </nav>
  ),
}));

vi.mock("@/app/providers/session-provider", () => ({
  useSession: () => ({ userId: mockSessionUserId, profile: null }),
}));

vi.mock("@/store/use-login-modal", () => ({
  useLoginModal: () => ({ open: mockOpenLoginModal }),
}));

vi.mock("@/store/use-snippet-modal", () => ({
  useSnippetModal: <T,>(
    selector: (state: {
      publishCount: number;
      lastPublishedUserId: number | null;
      open: () => void;
    }) => T,
  ) => selector({ publishCount: 0, lastPublishedUserId: null, open: vi.fn() }),
}));

vi.mock("@repo/hooks", () => ({
  useLocale: () => ({ t: (key: string) => key }),
}));

vi.mock("@/lib/toast", () => ({
  addToast: vi.fn(),
}));

vi.mock("@/components/comments", () => ({
  CommentModal: ({ targetId, targetType }: { targetId: number; targetType: string }) => (
    <div
      data-testid="comment-modal"
      data-target-id={String(targetId)}
      data-target-type={targetType}
    />
  ),
}));

vi.mock("./snippet-card", () => ({
  SnippetCard: ({
    snippet,
    onComment,
  }: {
    snippet: { id: number; content: string };
    onComment?: (snippet: { id: number; content: string }) => void;
  }) => (
    <div data-testid="snippet-card">
      <span>{snippet.content}</span>
      <button aria-label="评论" onClick={() => onComment?.(snippet)}>
        评论
      </button>
    </div>
  ),
}));

type TestMoment = MomentPageResp["list"][number];

function makeMoment(
  id: number,
  content = "列表碎语",
  overrides: Partial<TestMoment> = {},
): TestMoment {
  return {
    id,
    user_id: 1,
    content,
    status: 1,
    comment_status: 1,
    read_count: 0,
    is_top: false,
    like_count: 2,
    comment_count: 1,
    is_liked: false,
    images: [],
    created_at: "2026-05-30T09:00:00Z",
    updated_at: "2026-05-30T09:00:00Z",
    ...overrides,
  };
}

function makePageResp(overrides: Partial<MomentPageResp> = {}): MomentPageResp {
  return {
    total: 1,
    pages: 1,
    page: 1,
    page_size: 20,
    list: [makeMoment(1)],
    ...overrides,
  };
}

function getSnippetColumns(): HTMLElement[] {
  return Array.from(
    document.querySelectorAll<HTMLElement>(
      '[class*="min-w-0"][class*="flex-1"][class*="flex-col"]',
    ),
  );
}

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
  vi.stubGlobal(
    "IntersectionObserver",
    class MockIntersectionObserver {
      observe = vi.fn();
      unobserve = vi.fn();
      disconnect = vi.fn();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      constructor(_cb: any, _options?: any) {}
    },
  );
  mockSessionUserId = 7;
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("SnippetsList", () => {
  it("渲染碎语列表", () => {
    render(<SnippetsList initialPage={makePageResp()} />);
    expect(screen.getByText("列表碎语")).toBeTruthy();
  });

  it("无数据时显示空状态", () => {
    render(<SnippetsList initialPage={makePageResp({ list: [], total: 0 })} />);
    expect(screen.getByText("暂无碎语")).toBeTruthy();
  });

  it("点击评论打开 moment 弹窗", async () => {
    const user = userEvent.setup();
    render(<SnippetsList initialPage={makePageResp()} />);

    await user.click(screen.getByLabelText("评论"));

    const modal = screen.getByTestId("comment-modal");
    expect(modal.dataset.targetId).toBe("1");
    expect(modal.dataset.targetType).toBe("moment");
  });

  it("pages > 1 时显示加载更多哨兵", () => {
    render(<SnippetsList initialPage={makePageResp({ total: 40, pages: 2 })} />);

    // 无限滚动模式下有哨兵元素（h-px div）
    const sentinel = document.querySelector(".h-px");
    expect(sentinel).toBeTruthy();
  });

  it("pages === 1 时显示到底提示", () => {
    render(<SnippetsList initialPage={makePageResp({ total: 1, pages: 1 })} />);

    expect(screen.getByText("已经到底了")).toBeTruthy();
  });

  it("Tab 切换触发重新加载", async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify(makePageResp({ list: [] })), { status: 200 }),
    );

    render(<SnippetsList initialPage={makePageResp()} />);

    await user.click(screen.getByRole("button", { name: "博主" }));

    await waitFor(() => {
      expect(screen.getByText("暂无碎语")).toBeTruthy();
    });
  });

  it("从全部切到博主时重算瀑布流列分配", async () => {
    const user = userEvent.setup();
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 1024 });
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify(
          makePageResp({
            list: [makeMoment(2, "博主碎语 2"), makeMoment(4, "博主碎语 4")],
          }),
        ),
        { status: 200 },
      ),
    );

    render(
      <SnippetsList
        ownerUserId={1}
        initialPage={makePageResp({
          list: [
            makeMoment(1, "朋友长碎语".repeat(180)),
            makeMoment(2, "博主碎语 2"),
            makeMoment(3, "朋友长碎语".repeat(180)),
            makeMoment(4, "博主碎语 4"),
          ],
        })}
      />,
    );

    await user.click(screen.getByRole("button", { name: "博主" }));

    await waitFor(() => {
      const [firstColumn, secondColumn] = getSnippetColumns();
      expect(firstColumn).toHaveTextContent("博主碎语 2");
      expect(secondColumn).toHaveTextContent("博主碎语 4");
    });
  });
});

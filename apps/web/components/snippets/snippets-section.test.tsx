import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { SnippetsSection } from "./snippets-section";
import type { MomentItemResp, UserDetailResp } from "@repo/api";

const mockOpenLoginModal = vi.fn();
const mockOpenSnippetModal = vi.fn();
const toastMockState = vi.hoisted(() => ({
  addToast: vi.fn(),
}));
let mockSessionUserId: number | null = 7;
let mockSessionProfile: UserDetailResp | null = {
  id: 7,
  username: "test",
  nickname: "Test",
  status: 0,
  roles: ["user"],
};

// Mock @repo/icons
vi.mock("@repo/icons", () => ({
  SvgIcon: ({ name, size }: { name: string; size?: number }) => (
    <span data-testid={`icon-${name}`} data-size={size} />
  ),
}));

vi.mock("@repo/ui", () => ({
  cn: (...classes: Array<string | false | null | undefined>) => classes.filter(Boolean).join(" "),
  Button: ({
    children,
    variant,
    onPress,
    isDisabled,
    href,
    ...props
  }: {
    children: ReactNode;
    variant?: string;
    onPress?: () => void;
    isDisabled?: boolean;
    href?: string;
    [key: string]: unknown;
  }) =>
    href !== undefined ? (
      <a href={href} data-variant={variant} {...props}>
        {children}
      </a>
    ) : (
      <button data-variant={variant} onClick={onPress} disabled={isDisabled} {...props}>
        {children}
      </button>
    ),
  Card: ({ children, ...props }: { children: ReactNode; [key: string]: unknown }) => (
    <div {...props}>{children}</div>
  ),
  CardContent: ({ children, ...props }: { children: ReactNode; [key: string]: unknown }) => (
    <div {...props}>{children}</div>
  ),
  Avatar: ({ src, alt, initials }: { src?: string; alt?: string; initials?: string }) =>
    src ? <img src={src} alt={alt} /> : <span>{initials}</span>,
  Badge: ({ children, ...props }: { children: ReactNode; [key: string]: unknown }) => (
    <span {...props}>{children}</span>
  ),
}));

// Mock @repo/hooks useLocale
vi.mock("@repo/hooks", () => ({
  useLocale: () => ({
    locale: "zh",
    setLocale: () => undefined,
    t: (key: string) => {
      const messages: Record<string, string> = {
        "home.snippets": "碎语",
        "snippet.expand": "展开",
        "snippet.collapse": "收起",
        "snippet.like": "喜欢",
        "snippet.comment": "评论",
        "snippet.share": "转发",
        "snippet.postNew": "发表碎语",
        "snippet.viewMore": "查看更多",
        "snippet.shuffle": "换一批",
      };
      return messages[key] ?? key;
    },
  }),
}));

vi.mock("@/app/providers/session-provider", () => ({
  useSession: () => ({ userId: mockSessionUserId, profile: mockSessionProfile }),
}));

vi.mock("@/store/use-login-modal", () => ({
  useLoginModal: () => ({ open: mockOpenLoginModal }),
}));

vi.mock("@/store/use-snippet-modal", () => ({
  useSnippetModal: <T,>(
    selector?: (state: {
      open: () => void;
      publishCount: number;
      lastPublishedUserId: number | null;
    }) => T,
  ) => {
    const state = { open: mockOpenSnippetModal, publishCount: 0, lastPublishedUserId: null };
    return selector ? selector(state) : state;
  },
}));

vi.mock("@/lib/toast", () => ({
  addToast: toastMockState.addToast,
}));

vi.mock("@/components/comments", () => ({
  CommentModal: ({
    targetId,
    targetType,
  }: {
    targetId: number;
    targetType: string;
    onClose: () => void;
  }) => (
    <div
      data-testid="comment-modal"
      data-target-id={String(targetId)}
      data-target-type={targetType}
    />
  ),
}));

function makeMoment(
  id: number,
  content: string,
  overrides: Partial<MomentItemResp> = {},
): MomentItemResp {
  return {
    id,
    user_id: 1,
    content,
    status: 1,
    comment_status: 1,
    read_count: 0,
    is_top: false,
    like_count: 10,
    comment_count: 3,
    is_liked: false,
    user: {
      id: 1,
      username: `author${id}`,
      nickname: `作者${id}`,
      mark: "博主",
      avatar_url: `https://example.com/avatar${id}.jpg`,
    },
    images: [],
    created_at: "2026-05-30T09:00:00Z",
    updated_at: "2026-05-30T09:00:00Z",
    ...overrides,
  };
}

const SHORT_CONTENT = "这是一条短碎语，不超过120字符的限制。";

const LONG_CONTENT =
  "这是一条很长的碎语内容，超过了一百二十个字符的限制，需要显示展开按钮。" +
  "这部分内容在默认状态下应该被隐藏，只有点击展开按钮后才能看到全部内容。" +
  "这里是更多的补充内容，确保文本足够长。继续增加内容直到超过一百二十个字符为止，包括这段额外的说明文字。";

const mockMoments: MomentItemResp[] = [makeMoment(1, SHORT_CONTENT), makeMoment(2, LONG_CONTENT)];

function webSourcePath(path: string): string {
  return resolve(process.cwd().endsWith("apps/web") ? path : `apps/web/${path}`);
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
  mockSessionUserId = 7;
  mockSessionProfile = {
    id: 7,
    username: "test",
    nickname: "Test",
    status: 0,
    roles: ["user"],
  };
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
  mockOpenLoginModal.mockReset();
  mockOpenSnippetModal.mockReset();
  toastMockState.addToast.mockReset();
});

describe("SnippetsSection", () => {
  it("不再依赖旧的 useMomentEngagement hook", () => {
    const source = readFileSync(webSourcePath("components/snippets/snippets-section.tsx"), "utf8");
    expect(source).not.toContain("use-moment-engagement");
  });

  it("渲染不崩溃，显示碎语内容", () => {
    render(<SnippetsSection snippets={mockMoments} />);
    expect(screen.getByText("碎语")).toBeTruthy();
    // 重设计后 SHORT_CONTENT 可能出现在多个节点（正文 + 预览区），用 getAllByText
    expect(screen.getAllByText(SHORT_CONTENT).length).toBeGreaterThan(0);
  });

  it("长内容默认截断，显示展开按钮", () => {
    render(<SnippetsSection snippets={mockMoments} />);
    const expandBtns = screen.getAllByText("展开");
    expect(expandBtns.length).toBeGreaterThan(0);
    const truncated = LONG_CONTENT.slice(0, 120) + "...";
    expect(screen.getByText(truncated)).toBeTruthy();
    expect(screen.queryByText(LONG_CONTENT)).toBeNull();
  });

  it("点击展开后显示全部内容", async () => {
    const user = userEvent.setup();
    render(<SnippetsSection snippets={mockMoments} />);

    const expandBtn = screen.getAllByText("展开")[0];
    await act(async () => {
      await user.click(expandBtn);
    });

    expect(screen.getByText(LONG_CONTENT)).toBeTruthy();
    expect(screen.getByText("收起")).toBeTruthy();
  });

  it("点击收起后重新截断", async () => {
    const user = userEvent.setup();
    render(<SnippetsSection snippets={mockMoments} />);

    const expandBtn = screen.getAllByText("展开")[0];
    await act(async () => {
      await user.click(expandBtn);
    });

    const collapseBtn = screen.getByText("收起");
    await act(async () => {
      await user.click(collapseBtn);
    });

    expect(screen.queryByText(LONG_CONTENT)).toBeNull();
    expect(screen.getAllByText("展开").length).toBeGreaterThan(0);
  });

  it("底部渲染发表碎语（主操作）与查看更多（次操作）", () => {
    render(<SnippetsSection snippets={mockMoments} />);
    expect(screen.getByRole("button", { name: /发表碎语/ })).toBeTruthy();
    expect(screen.getByRole("link", { name: /查看更多/ })).toBeTruthy();
    expect(screen.getByTestId("icon-plus")).toBeTruthy();
    expect(screen.getByTestId("icon-arrow-forward")).toBeTruthy();
  });

  it("查看更多跳转到碎语页", () => {
    render(<SnippetsSection snippets={mockMoments} />);
    expect(screen.getByRole("link", { name: /查看更多/ }).getAttribute("href")).toBe("/snippets");
  });

  it("未登录时点击发表碎语会打开登录弹窗", async () => {
    const user = userEvent.setup();
    mockSessionUserId = null;
    mockSessionProfile = null;

    render(<SnippetsSection snippets={mockMoments} />);

    await user.click(screen.getByRole("button", { name: /发表碎语/ }));

    expect(mockOpenLoginModal).toHaveBeenCalledOnce();
    expect(mockOpenSnippetModal).not.toHaveBeenCalled();
  });

  it("已登录时点击发表碎语会打开写碎语弹窗", async () => {
    const user = userEvent.setup();

    render(<SnippetsSection snippets={mockMoments} />);

    await user.click(screen.getByRole("button", { name: /发表碎语/ }));

    expect(mockOpenSnippetModal).toHaveBeenCalledOnce();
    expect(mockOpenLoginModal).not.toHaveBeenCalled();
  });

  it("短内容不显示展开按钮", () => {
    render(<SnippetsSection snippets={[makeMoment(99, SHORT_CONTENT)]} />);
    expect(screen.queryByText("展开")).toBeNull();
  });

  it("显示作者名和徽章", () => {
    render(<SnippetsSection snippets={mockMoments} />);
    expect(screen.getByText("作者1")).toBeTruthy();
    expect(screen.getAllByText("博主").length).toBe(mockMoments.length);
  });

  it("显示点赞和评论统计数字", () => {
    render(<SnippetsSection snippets={mockMoments} />);
    const likeLabels = screen.getAllByText("10");
    const commentLabels = screen.getAllByText("3");
    expect(likeLabels).toHaveLength(mockMoments.length);
    expect(commentLabels).toHaveLength(mockMoments.length);
  });

  it("渲染换一批文字动作与 refresh 图标", () => {
    render(<SnippetsSection snippets={mockMoments} />);
    expect(screen.getByText("换一批")).toBeTruthy();
    expect(screen.getByTestId("icon-refresh-cw")).toBeTruthy();
    expect(screen.getByTestId("icon-refresh-cw").dataset.size).toBe("12");
  });

  it("不渲染渐变 header 图标", () => {
    render(<SnippetsSection snippets={mockMoments} />);
    expect(screen.queryByText("✦")).toBeNull();
  });

  it("snippets 为空时仍渲染区块标题和操作按钮", () => {
    render(<SnippetsSection snippets={[]} />);
    expect(screen.getByText("碎语")).toBeTruthy();
    expect(screen.getByText("发表碎语")).toBeTruthy();
    expect(screen.getByText((content) => content.includes("查看更多"))).toBeTruthy();
  });

  it("loading 时显示骨架屏", () => {
    const { container } = render(<SnippetsSection snippets={mockMoments} loading />);
    const skeletons = container.querySelectorAll('[aria-hidden="true"]');
    expect(skeletons.length).toBe(3);
  });

  it("最多只显示 3 条碎语", () => {
    const manyMoments = Array.from({ length: 6 }, (_, i) =>
      makeMoment(i + 1, `${SHORT_CONTENT} #${i + 1}`),
    );
    render(<SnippetsSection snippets={manyMoments} />);

    expect(screen.getByText(`${SHORT_CONTENT} #1`)).toBeTruthy();
    expect(screen.getByText(`${SHORT_CONTENT} #2`)).toBeTruthy();
    expect(screen.getByText(`${SHORT_CONTENT} #3`)).toBeTruthy();
    expect(screen.queryByText(`${SHORT_CONTENT} #4`)).toBeNull();
    expect(screen.queryByText(`${SHORT_CONTENT} #5`)).toBeNull();
    expect(screen.queryByText(`${SHORT_CONTENT} #6`)).toBeNull();
  });

  it("点击评论按钮后弹窗接收到正确的 momentId", async () => {
    const user = userEvent.setup();
    render(<SnippetsSection snippets={[makeMoment(7, SHORT_CONTENT)]} />);

    await user.click(screen.getByLabelText("评论"));

    const modal = screen.getByTestId("comment-modal");
    expect(modal.dataset.targetId).toBe("7");
    expect(modal.dataset.targetType).toBe("moment");
  });

  it("已登录时点击喜欢会调用接口并使用服务端最新结果更新状态", async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ is_liked: true, like_count: 9 }));

    render(<SnippetsSection snippets={[makeMoment(8, SHORT_CONTENT)]} />);

    await user.click(screen.getByRole("button", { name: "喜欢" }));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith("/api/moments/8/like", { method: "POST" });
      expect(screen.getByRole("button", { name: "喜欢" })).toHaveAttribute("aria-pressed", "true");
      expect(screen.getByText("9")).toBeTruthy();
    });
  });

  it("未登录时点击喜欢会打开全局登录弹窗", async () => {
    const user = userEvent.setup();
    mockSessionUserId = null;

    render(<SnippetsSection snippets={[makeMoment(9, SHORT_CONTENT)]} />);

    await user.click(screen.getByRole("button", { name: "喜欢" }));

    expect(mockOpenLoginModal).toHaveBeenCalledOnce();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("取消点赞失败时 toast 展示后端返回的具体原因", async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ error: "操作太频繁，请稍后再试" }, 500));

    render(
      <SnippetsSection
        snippets={[makeMoment(10, SHORT_CONTENT, { is_liked: true, like_count: 5 })]}
      />,
    );

    await user.click(screen.getByRole("button", { name: "喜欢" }));

    await waitFor(() => {
      expect(toastMockState.addToast).toHaveBeenCalledWith("操作太频繁，请稍后再试", "error");
    });
  });
});

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { MomentsSection } from "./moments-section";
import type { MomentItemResp, UserDetailResp } from "@repo/api";

const mockOpenLoginModal = vi.fn();
const mockOpenMomentModal = vi.fn();
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
        "home.moments": "碎语",
        "moment.expand": "展开",
        "moment.collapse": "收起",
        "moment.like": "喜欢",
        "moment.comment": "评论",
        "moment.share": "转发",
        "moment.postNew": "发表碎语",
        "moment.viewMore": "查看更多",
        "moment.shuffle": "换一批",
      };
      return messages[key] ?? key;
    },
  }),
  useHydrated: () => true,
  useDeferredMediaActivation: () => true,
  useImageLoadPlaceholder: () => ({
    isLoading: false,
    state: undefined,
    hideImage: false,
    renderPlaceholder: false,
    placeholderOpaque: false,
    animateImage: false,
  }),
  shouldDeferRemoteMediaSrc: () => false,
}));

vi.mock("@/app/providers/session-provider", () => ({
  useSession: () => ({ userId: mockSessionUserId, profile: mockSessionProfile }),
}));

vi.mock("@/store/use-login-modal", () => ({
  useLoginModal: () => ({ open: mockOpenLoginModal }),
}));

vi.mock("@/store/use-moment-modal", () => ({
  useMomentModal: <T,>(
    selector?: (state: {
      open: () => void;
      publishCount: number;
      lastPublishedUserId: number | null;
    }) => T,
  ) => {
    const state = { open: mockOpenMomentModal, publishCount: 0, lastPublishedUserId: null };
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
  mockOpenMomentModal.mockReset();
  toastMockState.addToast.mockReset();
});

describe("MomentsSection", () => {
  it("不再依赖旧的 useMomentEngagement hook", () => {
    const source = readFileSync(webSourcePath("components/moments/moments-section.tsx"), "utf8");
    expect(source).not.toContain("use-moment-engagement");
  });

  it("渲染不崩溃，显示碎语内容", () => {
    render(<MomentsSection initialMoments={mockMoments} />);
    expect(screen.getByText("碎语")).toBeTruthy();
    // 重设计后 SHORT_CONTENT 可能出现在多个节点（正文 + 预览区），用 getAllByText
    expect(screen.getAllByText(SHORT_CONTENT).length).toBeGreaterThan(0);
  });

  it("长内容完整展示，不显示展开按钮", () => {
    render(<MomentsSection initialMoments={mockMoments} />);
    expect(screen.getByText(LONG_CONTENT)).toBeTruthy();
    expect(screen.queryByText("展开")).toBeNull();
    expect(screen.queryByText("收起")).toBeNull();
  });

  it("底部渲染发表碎语（主操作）与查看更多（次操作）", () => {
    render(<MomentsSection initialMoments={mockMoments} />);
    expect(screen.getByRole("button", { name: /发表碎语/ })).toBeTruthy();
    expect(screen.getByRole("link", { name: /查看更多/ })).toBeTruthy();
    expect(screen.getByTestId("icon-plus")).toBeTruthy();
    expect(screen.getByTestId("icon-arrow-forward")).toBeTruthy();
  });

  it("查看更多跳转到碎语页", () => {
    render(<MomentsSection initialMoments={mockMoments} />);
    expect(screen.getByRole("link", { name: /查看更多/ }).getAttribute("href")).toBe("/moments");
  });

  it("未登录时点击发表碎语会打开登录弹窗", async () => {
    const user = userEvent.setup();
    mockSessionUserId = null;
    mockSessionProfile = null;

    render(<MomentsSection initialMoments={mockMoments} />);

    await user.click(screen.getByRole("button", { name: /发表碎语/ }));

    expect(mockOpenLoginModal).toHaveBeenCalledOnce();
    expect(mockOpenMomentModal).not.toHaveBeenCalled();
  });

  it("已登录时点击发表碎语会打开写碎语弹窗", async () => {
    const user = userEvent.setup();

    render(<MomentsSection initialMoments={mockMoments} />);

    await user.click(screen.getByRole("button", { name: /发表碎语/ }));

    expect(mockOpenMomentModal).toHaveBeenCalledOnce();
    expect(mockOpenLoginModal).not.toHaveBeenCalled();
  });

  it("短内容不显示展开按钮", () => {
    render(<MomentsSection initialMoments={[makeMoment(99, SHORT_CONTENT)]} />);
    expect(screen.queryByText("展开")).toBeNull();
  });

  it("显示作者名和徽章", () => {
    render(<MomentsSection initialMoments={mockMoments} />);
    expect(screen.getByText("作者1")).toBeTruthy();
    expect(screen.getAllByText("博主").length).toBe(mockMoments.length);
  });

  it("显示点赞和评论统计数字", () => {
    render(<MomentsSection initialMoments={mockMoments} />);
    const likeLabels = screen.getAllByText("10");
    const commentLabels = screen.getAllByText("3");
    expect(likeLabels).toHaveLength(mockMoments.length);
    expect(commentLabels).toHaveLength(mockMoments.length);
  });

  it("渲染换一批文字动作与 refresh 图标", () => {
    render(<MomentsSection initialMoments={mockMoments} />);
    expect(screen.getByText("换一批")).toBeTruthy();
    expect(screen.getByTestId("icon-refresh-cw")).toBeTruthy();
    expect(screen.getByTestId("icon-refresh-cw").dataset.size).toBe("12");
  });

  it("不渲染渐变 header 图标", () => {
    render(<MomentsSection initialMoments={mockMoments} />);
    expect(screen.queryByText("✦")).toBeNull();
  });

  it("moments 为空时仍渲染区块标题和操作按钮", () => {
    render(<MomentsSection initialMoments={[]} />);
    expect(screen.getByText("碎语")).toBeTruthy();
    expect(screen.getByText("发表碎语")).toBeTruthy();
    expect(screen.getByText((content) => content.includes("查看更多"))).toBeTruthy();
  });

  it("loading 时显示骨架屏", () => {
    const { container } = render(<MomentsSection initialMoments={mockMoments} loading />);
    const skeletons = container.querySelectorAll('[aria-hidden="true"]');
    expect(skeletons.length).toBe(3);
  });

  it("最多只显示 3 条碎语", () => {
    const manyMoments = Array.from({ length: 6 }, (_, i) =>
      makeMoment(i + 1, `${SHORT_CONTENT} #${i + 1}`),
    );
    render(<MomentsSection initialMoments={manyMoments} />);

    expect(screen.getByText(`${SHORT_CONTENT} #1`)).toBeTruthy();
    expect(screen.getByText(`${SHORT_CONTENT} #2`)).toBeTruthy();
    expect(screen.getByText(`${SHORT_CONTENT} #3`)).toBeTruthy();
    expect(screen.queryByText(`${SHORT_CONTENT} #4`)).toBeNull();
    expect(screen.queryByText(`${SHORT_CONTENT} #5`)).toBeNull();
    expect(screen.queryByText(`${SHORT_CONTENT} #6`)).toBeNull();
  });

  it("点击评论按钮后弹窗接收到正确的 momentId", async () => {
    const user = userEvent.setup();
    render(<MomentsSection initialMoments={[makeMoment(7, SHORT_CONTENT)]} />);

    await user.click(screen.getByLabelText("评论"));

    const modal = screen.getByTestId("comment-modal");
    expect(modal.dataset.targetId).toBe("7");
    expect(modal.dataset.targetType).toBe("moment");
  });

  it("已登录时点击喜欢会调用接口并使用服务端最新结果更新状态", async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ is_liked: true, like_count: 9 }));

    render(<MomentsSection initialMoments={[makeMoment(8, SHORT_CONTENT)]} />);

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

    render(<MomentsSection initialMoments={[makeMoment(9, SHORT_CONTENT)]} />);

    await user.click(screen.getByRole("button", { name: "喜欢" }));

    expect(mockOpenLoginModal).toHaveBeenCalledOnce();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("取消点赞失败时 toast 展示后端返回的具体原因", async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ error: "操作太频繁，请稍后再试" }, 500));

    render(
      <MomentsSection
        initialMoments={[makeMoment(10, SHORT_CONTENT, { is_liked: true, like_count: 5 })]}
      />,
    );

    await user.click(screen.getByRole("button", { name: "喜欢" }));

    await waitFor(() => {
      expect(toastMockState.addToast).toHaveBeenCalledWith("操作太频繁，请稍后再试", "error");
    });
  });

  it("点击换一批会请求随机碎语并替换卡片，exclude_ids 携带当前已展示的碎语 ID", async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse({
        total: 10,
        pages: 1,
        page: 1,
        page_size: 3,
        list: [makeMoment(101, "换一批换出来的碎语")],
      }),
    );

    render(
      <MomentsSection
        initialMoments={[makeMoment(1, SHORT_CONTENT), makeMoment(2, LONG_CONTENT)]}
      />,
    );

    await user.click(screen.getByRole("button", { name: /换一批/ }));

    await waitFor(() => {
      expect(screen.getByText("换一批换出来的碎语")).toBeTruthy();
    });
    expect(screen.queryByText(SHORT_CONTENT)).toBeNull();

    const calledUrl = vi.mocked(fetch).mock.calls.at(-1)?.[0] as string;
    const url = new URL(calledUrl, "http://localhost");
    expect(url.pathname).toBe("/api/moments");
    expect(url.searchParams.get("random")).toBe("true");
    expect(url.searchParams.get("exclude_ids")).toBe("1,2");
    expect(url.searchParams.get("page_size")).toBe("3");
    expect(url.searchParams.has("user_id")).toBe(false);
  });

  it("换一批请求进行中按钮禁用，请求完成后恢复可点击", async () => {
    const user = userEvent.setup();
    let resolveFetch!: (value: Response) => void;
    vi.mocked(fetch).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveFetch = resolve;
        }),
    );

    render(<MomentsSection initialMoments={[makeMoment(1, SHORT_CONTENT)]} />);

    const shuffleButton = screen.getByRole("button", { name: /换一批/ });
    await user.click(shuffleButton);

    expect(shuffleButton).toBeDisabled();

    await act(async () => {
      resolveFetch(jsonResponse({ total: 1, pages: 1, page: 1, page_size: 3, list: [] }));
    });

    await waitFor(() => {
      expect(shuffleButton).not.toBeDisabled();
    });
  });

  it("换一批失败时 toast 展示兜底文案，不改变已展示内容", async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockRejectedValueOnce(new TypeError("Failed to fetch"));

    render(<MomentsSection initialMoments={[makeMoment(1, SHORT_CONTENT)]} />);

    await user.click(screen.getByRole("button", { name: /换一批/ }));

    await waitFor(() => {
      expect(toastMockState.addToast).toHaveBeenCalledWith("换一批失败，请稍后重试", "error");
    });
    expect(screen.getByText(SHORT_CONTENT)).toBeTruthy();
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { useArticleEngagement } from "./use-article-engagement";
import { useActiveArticle } from "@/store/use-active-article";

const mockOpenLoginModal = vi.fn();
const mockAddToast = vi.fn();
const mockFetch = vi.fn();
let mockUserId: number | null = null;

function webSourcePath(path: string): string {
  return resolve(process.cwd().endsWith("apps/web") ? path : `apps/web/${path}`);
}

vi.mock("@/app/providers/session-provider", () => ({
  useSession: () => ({ userId: mockUserId }),
}));

vi.mock("@/store/use-login-modal", () => ({
  useLoginModal: () => ({ open: mockOpenLoginModal }),
}));

vi.mock("@/lib/toast", () => ({
  addToast: (...args: unknown[]) => mockAddToast(...args),
}));

describe("useArticleEngagement", () => {
  beforeEach(() => {
    mockUserId = null;
    mockOpenLoginModal.mockReset();
    mockAddToast.mockReset();
    mockFetch.mockReset();
    vi.stubGlobal("fetch", mockFetch);
    useActiveArticle.getState().clearArticle();
    useActiveArticle.getState().syncArticle({
      articleId: 7,
      likeCount: 5,
      commentCount: 9,
      isLiked: false,
      readCount: 100,
    });
  });

  it("未登录点赞时打开登录弹窗，不发请求", async () => {
    const { result } = renderHook(() => useArticleEngagement());

    await act(async () => {
      await result.current.toggleLike();
    });

    expect(mockOpenLoginModal).toHaveBeenCalledOnce();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("不在 hook 内直接调用 fetch", () => {
    const source = readFileSync(webSourcePath("hooks/use-article-engagement.ts"), "utf8");
    expect(source).not.toContain("fetch(");
  });

  it("点赞成功后更新 store 中的 likeCount 和 isLiked", async () => {
    mockUserId = 1;
    mockFetch.mockResolvedValue(
      new Response(JSON.stringify({ like_count: 6, is_liked: true }), { status: 200 }),
    );

    const { result } = renderHook(() => useArticleEngagement());

    await act(async () => {
      await result.current.toggleLike();
    });

    expect(useActiveArticle.getState()).toMatchObject({
      likeCount: 6,
      isLiked: true,
    });
  });

  it("401 时打开登录弹窗", async () => {
    mockUserId = 1;
    mockFetch.mockResolvedValue(new Response(null, { status: 401 }));

    const { result } = renderHook(() => useArticleEngagement());

    await act(async () => {
      await result.current.toggleLike();
    });

    expect(mockOpenLoginModal).toHaveBeenCalledOnce();
  });

  it("业务错误时 toast 展示后端返回的具体原因", async () => {
    mockUserId = 1;
    mockFetch.mockResolvedValue(
      new Response(JSON.stringify({ error: "文章已锁定，无法点赞" }), { status: 400 }),
    );

    const { result } = renderHook(() => useArticleEngagement());

    await act(async () => {
      await result.current.toggleLike();
    });

    expect(mockAddToast).toHaveBeenCalledWith("文章已锁定，无法点赞", "error");
  });

  it("网络异常时 toast 展示兜底文案", async () => {
    mockUserId = 1;
    mockFetch.mockRejectedValue(new TypeError("Failed to fetch"));

    const { result } = renderHook(() => useArticleEngagement());

    await act(async () => {
      await result.current.toggleLike();
    });

    expect(mockAddToast).toHaveBeenCalledWith("点赞失败，请稍后重试", "error");
  });
});

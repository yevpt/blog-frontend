import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useCommentSubmit } from "./use-comment-submit";

describe("useCommentSubmit", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    global.fetch = vi.fn();
  });

  describe("submitComment", () => {
    it("成功时返回新评论数据", async () => {
      const created = {
        id: 1,
        target_type: "article",
        target_id: 5,
        user_id: 1,
        content: "内容",
        replies: [],
        created_at: "",
        updated_at: "",
      };
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(created),
      } as Response);

      const { result } = renderHook(() => useCommentSubmit("article", 5));
      let returned: unknown;
      await act(async () => {
        returned = await result.current.submitComment("内容");
      });

      expect(returned).toEqual(created);
      expect(result.current.error).toBeNull();
    });

    it("401 时设置 error 并返回 null", async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ error: "Unauthorized" }),
      } as Response);

      const { result } = renderHook(() => useCommentSubmit("article", 5));
      let returned: unknown;
      await act(async () => {
        returned = await result.current.submitComment("内容");
      });

      expect(returned).toBeNull();
      expect(result.current.error).toBe("请先登录");
    });

    it("isSubmitting 期间重复调用返回 null 且不发请求", async () => {
      let resolveFetch!: (value: Response) => void;
      vi.mocked(global.fetch).mockReturnValue(
        new Promise((resolve) => {
          resolveFetch = resolve;
        }),
      );

      const { result } = renderHook(() => useCommentSubmit("article", 5));

      let firstSubmit!: Promise<unknown>;
      act(() => {
        firstSubmit = result.current.submitComment("内容");
      });

      expect(result.current.isSubmitting).toBe(true);

      let returnedSecond: unknown;
      await act(async () => {
        returnedSecond = await result.current.submitComment("内容");
      });
      expect(returnedSecond).toBeNull();
      expect(global.fetch).toHaveBeenCalledTimes(1);

      resolveFetch({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ id: 1, replies: [], created_at: "", updated_at: "" }),
      } as Response);
      await act(async () => {
        await firstSubmit;
      });
    });
  });

  describe("submitReply", () => {
    it("成功时返回新回复数据", async () => {
      const created = {
        id: 5,
        target_type: "article",
        comment_id: 1,
        from_user_id: 2,
        to_user_id: 1,
        parent_reply_id: 0,
        content: "回复",
        created_at: "",
        updated_at: "",
      };
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(created),
      } as Response);

      const { result } = renderHook(() => useCommentSubmit("article", 5));
      let returned: unknown;
      await act(async () => {
        returned = await result.current.submitReply(1, "回复", 0);
      });

      expect(returned).toEqual(created);
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/comments/1/replies",
        expect.objectContaining({ method: "POST" }),
      );
    });
  });
});

import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { demoPosts } from "./posts";
import { usePostFilter } from "./use-post-filter";

describe("usePostFilter", () => {
  it("初始状态返回全部文章", () => {
    const { result } = renderHook(() => usePostFilter());
    expect(result.current.status).toBe("all");
    expect(result.current.posts).toHaveLength(demoPosts.length);
  });

  it("切换至 published 只返回已发布文章", () => {
    const { result } = renderHook(() => usePostFilter());
    act(() => result.current.setStatus("published"));
    expect(result.current.posts.every((p) => p.status === "published")).toBe(true);
  });

  it("切换至 draft 只返回草稿文章", () => {
    const { result } = renderHook(() => usePostFilter());
    act(() => result.current.setStatus("draft"));
    expect(result.current.posts.every((p) => p.status === "draft")).toBe(true);
  });

  it("counts.published + counts.draft 等于 counts.all", () => {
    const { result } = renderHook(() => usePostFilter());
    const { counts } = result.current;
    expect(counts.published + counts.draft).toBe(counts.all);
    expect(counts.all).toBe(demoPosts.length);
  });

  it("支持设置初始 status", () => {
    const { result } = renderHook(() => usePostFilter("published"));
    expect(result.current.status).toBe("published");
    expect(result.current.posts.every((p) => p.status === "published")).toBe(true);
  });
});

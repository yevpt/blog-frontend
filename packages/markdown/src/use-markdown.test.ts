import { describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useMarkdown } from "./use-markdown";

describe("useMarkdown", () => {
  it("初始状态：html 为 null，isLoading 为 true，error 为 null", () => {
    const renderFn = vi.fn().mockResolvedValue("<p>hello</p>");
    const { result } = renderHook(() => useMarkdown("hello", renderFn));
    expect(result.current.html).toBeNull();
    expect(result.current.isLoading).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it("渲染完成后 html 有值，isLoading 变为 false", async () => {
    const renderFn = vi.fn().mockResolvedValue("<p>hello</p>");
    const { result } = renderHook(() => useMarkdown("hello", renderFn));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.html).toBe("<p>hello</p>");
    expect(result.current.error).toBeNull();
  });

  it("content 变化时重新调用 renderFn", async () => {
    const renderFn = vi.fn().mockResolvedValue("<p>content</p>");
    const { result, rerender } = renderHook(
      ({ content }: { content: string }) => useMarkdown(content, renderFn),
      { initialProps: { content: "hello" } },
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    rerender({ content: "world" });
    await waitFor(() => expect(renderFn).toHaveBeenCalledWith("world"));
  });

  it("renderFn 抛出异常时 error 有值，html 保持 null", async () => {
    const renderFn = vi.fn().mockRejectedValue(new Error("parse error"));
    const { result } = renderHook(() => useMarkdown("bad", renderFn));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBe("parse error");
    expect(result.current.html).toBeNull();
  });

  it("content 为空字符串时正常调用 renderFn", async () => {
    const renderFn = vi.fn().mockResolvedValue("");
    const { result } = renderHook(() => useMarkdown("", renderFn));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(renderFn).toHaveBeenCalledWith("");
  });
});

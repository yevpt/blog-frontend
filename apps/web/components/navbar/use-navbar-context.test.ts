import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useNavbarContext } from "./use-navbar-context";

let mockPathname = "/";

vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
}));

describe("useNavbarContext", () => {
  beforeEach(() => {
    mockPathname = "/";
  });

  it("首页返回 home 变体，并隐藏返回与文章操作", () => {
    const { result } = renderHook(() => useNavbarContext());

    expect(result.current.pathname).toBe("/");
    expect(result.current.mobileVariant).toBe("home");
    expect(result.current.showHomeBack).toBe(false);
    expect(result.current.showArticleActions).toBe(false);
    expect(result.current.desktopCapsuleThreshold).toBe(24);
  });

  it("文章详情页返回 article 变体，并显示文章操作", () => {
    mockPathname = "/articles/42";

    const { result } = renderHook(() => useNavbarContext());

    expect(result.current.pathname).toBe("/articles/42");
    expect(result.current.mobileVariant).toBe("article");
    expect(result.current.showHomeBack).toBe(true);
    expect(result.current.showArticleActions).toBe(true);
    expect(result.current.desktopCapsuleThreshold).toBe(24);
  });

  it("碎语页复用 home variant，无标题", () => {
    mockPathname = "/moments";

    const { result } = renderHook(() => useNavbarContext());

    expect(result.current.title).toBeUndefined();
    expect(result.current.mobileVariant).toBe("home");
    expect(result.current.desktopCapsuleThreshold).toBe(24);
  });
});

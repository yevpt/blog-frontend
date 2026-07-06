import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { isSvgAssetUrl, useSvgPreviewUrl } from "./use-svg-preview-url";

const brokenSvg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24"><path xmlns="http://www.w3.org/2000/svg" fill="currentColor" d="M6 19"/></svg>`;

describe("isSvgAssetUrl", () => {
  it("识别 https SVG 地址", () => {
    expect(
      isSvgAssetUrl("https://blog-dev-oss.yevpt.com/blog/categories/11/icon/test.svg?a=1&b=2"),
    ).toBe(true);
  });

  it("非 SVG 返回 false", () => {
    expect(isSvgAssetUrl("https://cdn.example.com/cover.jpg")).toBe(false);
  });
});

describe("useSvgPreviewUrl", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("位图地址直接透传", async () => {
    const { result } = renderHook(() => useSvgPreviewUrl("https://cdn.example.com/cover.jpg"));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(result.current.displayUrl).toBe("https://cdn.example.com/cover.jpg");
    expect(result.current.hasError).toBe(false);
  });

  it("SVG 地址 fetch 后生成 data URL", async () => {
    const svg = brokenSvg;
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(svg),
      }),
    );

    const source = "https://cdn.example.com/icon.svg?sign=1";
    const { result } = renderHook(() => useSvgPreviewUrl(source));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.displayUrl).toMatch(/^data:image\/svg\+xml/);
      expect(result.current.hasError).toBe(false);
    });
    expect(fetch).toHaveBeenCalledWith(source, { mode: "cors", credentials: "omit" });
  });

  it("fetch 失败时标记错误且不回落到原始 URL", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network")));

    const { result } = renderHook(() => useSvgPreviewUrl("https://cdn.example.com/icon.svg"));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.hasError).toBe(true);
      expect(result.current.displayUrl).toBe("");
    });
  });
});

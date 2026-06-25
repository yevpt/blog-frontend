import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";

const pathname = { value: "/" };
vi.mock("next/navigation", () => ({
  usePathname: () => pathname.value,
}));

import { AnalyticsTracker } from "./react";

describe("AnalyticsTracker", () => {
  beforeEach(() => {
    pathname.value = "/";
    sessionStorage.clear();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 204 })));
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("挂载即上报首屏 page_view", () => {
    render(<AnalyticsTracker />);
    expect(fetch).toHaveBeenCalledTimes(1);
    const body = JSON.parse(vi.mocked(fetch).mock.calls[0][1]!.body as string);
    expect(body).toMatchObject({ event_type: "page_view", path: "/" });
  });

  it("pathname 变化触发新的 page_view", () => {
    const { rerender } = render(<AnalyticsTracker />);
    expect(fetch).toHaveBeenCalledTimes(1);
    pathname.value = "/posts/1";
    rerender(<AnalyticsTracker />);
    const pvCalls = vi
      .mocked(fetch)
      .mock.calls.filter((c) => JSON.parse(c[1]!.body as string).event_type === "page_view");
    expect(pvCalls).toHaveLength(2);
    expect(JSON.parse(pvCalls[1][1]!.body as string).path).toBe("/posts/1");
  });

  it("pathname 不变的重渲染不重复上报 PV", () => {
    const { rerender } = render(<AnalyticsTracker />);
    rerender(<AnalyticsTracker />);
    const pvCalls = vi
      .mocked(fetch)
      .mock.calls.filter((c) => JSON.parse(c[1]!.body as string).event_type === "page_view");
    expect(pvCalls).toHaveLength(1);
  });
});

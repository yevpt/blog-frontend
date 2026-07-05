import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { isMobileDevice, resetMobileDeviceCache } from "./is-mobile-device";

interface MockNavigator extends Navigator {
  userAgent: string;
  maxTouchPoints: number;
}

function mockNavigator(userAgent: string, maxTouchPoints: number): void {
  Object.defineProperty(globalThis, "navigator", {
    value: { userAgent, maxTouchPoints } as MockNavigator,
    configurable: true,
    writable: true,
  });
}

beforeEach(() => {
  resetMobileDeviceCache();
});

afterEach(() => {
  vi.unstubAllGlobals();
  resetMobileDeviceCache();
});

describe("isMobileDevice", () => {
  it("iPhone UA 且支持触摸 → 移动端（含 iOS Chrome/WKWebView）", () => {
    mockNavigator(
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1",
      5,
    );
    expect(isMobileDevice()).toBe(true);
  });

  it("Android Mobi UA 且支持触摸 → 移动端", () => {
    mockNavigator(
      "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
      5,
    );
    expect(isMobileDevice()).toBe(true);
  });

  it("桌面 Chrome UA（无移动关键字）→ 非移动端，即使有触摸屏", () => {
    mockNavigator(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      5, // 触摸笔记本，但 UA 不含移动关键字
    );
    expect(isMobileDevice()).toBe(false);
  });

  it("Mobi UA 但 maxTouchPoints=0 → 非移动端", () => {
    mockNavigator("Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Mobile Safari/537.36", 0);
    expect(isMobileDevice()).toBe(false);
  });

  it("桌面 UA 且无触摸 → 非移动端", () => {
    mockNavigator(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
      0,
    );
    expect(isMobileDevice()).toBe(false);
  });

  it("结果在页面生命周期内缓存", () => {
    mockNavigator("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) Mobile/15E148", 5);
    expect(isMobileDevice()).toBe(true);
    // 改 navigator 后应仍返回缓存值（同一页面生命周期内不变）
    mockNavigator("Mozilla/5.0 (Windows NT 10.0; Win64; x64)", 0);
    expect(isMobileDevice()).toBe(true);
    resetMobileDeviceCache();
    expect(isMobileDevice()).toBe(false);
  });

  it("SSR（无 navigator）→ false", () => {
    const original = globalThis.navigator;
    Object.defineProperty(globalThis, "navigator", {
      value: undefined,
      configurable: true,
      writable: true,
    });
    resetMobileDeviceCache();
    expect(isMobileDevice()).toBe(false);
    Object.defineProperty(globalThis, "navigator", {
      value: original,
      configurable: true,
      writable: true,
    });
  });
});

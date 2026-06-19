import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { useSidebar } from "./useSidebar";

describe("useSidebar", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("切换折叠状态并写入 localStorage", () => {
    const { result } = renderHook(() => useSidebar());

    expect(result.current.isCollapsed).toBe(false);

    act(() => result.current.toggleCollapsed());

    expect(result.current.isCollapsed).toBe(true);
    expect(localStorage.getItem("admin_sidebar_collapsed")).toBe("true");
  });

  it("初始化时读取已保存的折叠状态", () => {
    localStorage.setItem("admin_sidebar_collapsed", "true");

    const { result } = renderHook(() => useSidebar());

    expect(result.current.isCollapsed).toBe(true);
  });

  it("控制移动端抽屉开合", () => {
    const { result } = renderHook(() => useSidebar());

    act(() => result.current.openMobile());
    expect(result.current.isMobileOpen).toBe(true);

    act(() => result.current.closeMobile());
    expect(result.current.isMobileOpen).toBe(false);
  });
});

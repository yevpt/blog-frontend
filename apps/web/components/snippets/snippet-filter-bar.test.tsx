import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { ReactNode } from "react";
import { SnippetFilterBar } from "./snippet-filter-bar";

vi.mock("@repo/icons", () => ({
  SvgIcon: ({ name }: { name: string }) => <span data-testid={`icon-${name}`} />,
}));

vi.mock("@repo/ui", () => ({
  Button: ({
    children,
    onPress,
    ...props
  }: {
    children: ReactNode;
    onPress?: () => void;
    [key: string]: unknown;
  }) => (
    <button onClick={onPress} {...props}>
      {children}
    </button>
  ),
  Tabs: ({
    children,
    onSelectionChange,
  }: {
    children: ReactNode;
    selectedKey?: string;
    onSelectionChange?: (key: string) => void;
  }) => {
    const handleSelect = (e: { target: EventTarget | null }) => {
      const btn = (e.target as HTMLElement).closest("button[data-tab-id]");
      if (btn && onSelectionChange) {
        onSelectionChange(btn.getAttribute("data-tab-id") ?? "");
      }
    };
    return (
      <div role="presentation" onClick={handleSelect} onKeyDown={handleSelect}>
        {children}
      </div>
    );
  },
  TabsList: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  TabsItem: ({ children, id }: { children: ReactNode; id?: string; variant?: string }) => (
    <button data-tab-id={id}>{children}</button>
  ),
}));

describe("SnippetFilterBar", () => {
  it("渲染不崩溃", () => {
    expect(() =>
      render(
        <SnippetFilterBar
          activeTab="all"
          onTabChange={vi.fn()}
          activeSort="latest"
          onSortChange={vi.fn()}
        />,
      ),
    ).not.toThrow();
  });

  it("显示页面标题", () => {
    render(
      <SnippetFilterBar
        activeTab="owner"
        onTabChange={vi.fn()}
        activeSort="latest"
        onSortChange={vi.fn()}
      />,
    );

    expect(screen.getByText("最近碎语")).toBeTruthy();
    expect(screen.getByText("最近在聊些什么")).toBeTruthy();
  });

  it("显示 Tab 与当前排序", () => {
    render(
      <SnippetFilterBar
        activeTab="owner"
        onTabChange={vi.fn()}
        activeSort="latest"
        onSortChange={vi.fn()}
      />,
    );

    expect(screen.getByText("全部")).toBeTruthy();
    expect(screen.getByText("博主")).toBeTruthy();
    expect(screen.getByText("朋友们")).toBeTruthy();
    expect(screen.getByText("最新")).toBeTruthy();
    expect(screen.getByTestId("icon-arrow-up-down")).toBeTruthy();
    expect(screen.queryByText("最热")).toBeNull();
  });

  it("activeSort 为 popular 时显示最热", () => {
    render(
      <SnippetFilterBar
        activeTab="owner"
        onTabChange={vi.fn()}
        activeSort="popular"
        onSortChange={vi.fn()}
      />,
    );

    expect(screen.getByText("最热")).toBeTruthy();
    expect(screen.queryByText("最新")).toBeNull();
  });

  it("点击 Tab 触发 onTabChange", () => {
    const onTabChange = vi.fn();
    render(
      <SnippetFilterBar
        activeTab="owner"
        onTabChange={onTabChange}
        activeSort="latest"
        onSortChange={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByText("朋友们"));
    expect(onTabChange).toHaveBeenCalledWith("friends");
  });

  it("点击排序切换为最热", () => {
    const onSortChange = vi.fn();
    render(
      <SnippetFilterBar
        activeTab="owner"
        onTabChange={vi.fn()}
        activeSort="latest"
        onSortChange={onSortChange}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "排序：最新，点击切换" }));
    expect(onSortChange).toHaveBeenCalledWith("popular");
  });

  it("点击排序切换为最新", () => {
    const onSortChange = vi.fn();
    render(
      <SnippetFilterBar
        activeTab="owner"
        onTabChange={vi.fn()}
        activeSort="popular"
        onSortChange={onSortChange}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "排序：最热，点击切换" }));
    expect(onSortChange).toHaveBeenCalledWith("latest");
  });
});

import { describe, it, expect, vi, beforeAll } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Tabs, TabsList, TabsItem, TabsPanels, TabsPanel } from "./tabs";

// SelectionIndicator 使用 Web Animations API 和 ResizeObserver，happy-dom 未实现，需打桩
beforeAll(() => {
  if (!HTMLElement.prototype.getAnimations) {
    HTMLElement.prototype.getAnimations = () => [];
  }
  if (typeof ResizeObserver === "undefined") {
    class MockResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
    (globalThis as Record<string, unknown>).ResizeObserver = MockResizeObserver;
  }
});

function TestTabs({ onSelectionChange }: { onSelectionChange?: (key: string) => void }) {
  return (
    <Tabs defaultSelectedKey="all" onSelectionChange={(k) => onSelectionChange?.(String(k))}>
      <TabsList variant="button-brand-horizontal">
        <TabsItem id="all">全部</TabsItem>
        <TabsItem id="coding">编程</TabsItem>
        <TabsItem id="tools">工具</TabsItem>
      </TabsList>
      <TabsPanels>
        <TabsPanel id="all">全部内容</TabsPanel>
        <TabsPanel id="coding">编程内容</TabsPanel>
        <TabsPanel id="tools">工具内容</TabsPanel>
      </TabsPanels>
    </Tabs>
  );
}

describe("Tabs", () => {
  it("渲染不崩溃，显示所有 Tab 标签", () => {
    render(<TestTabs />);
    expect(screen.getByText("全部")).toBeTruthy();
    expect(screen.getByText("编程")).toBeTruthy();
    expect(screen.getByText("工具")).toBeTruthy();
  });

  it("默认选中第一个 Tab，显示对应 Panel", () => {
    render(<TestTabs />);
    expect(screen.getByText("全部内容")).toBeTruthy();
    expect(screen.queryByText("编程内容")).toBeNull();
  });

  it("点击 Tab 切换面板", async () => {
    const user = userEvent.setup();
    render(<TestTabs />);
    await user.click(screen.getByText("编程"));
    expect(screen.getByText("编程内容")).toBeTruthy();
    expect(screen.queryByText("全部内容")).toBeNull();
  });

  it("onSelectionChange 在切换时触发", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<TestTabs onSelectionChange={onChange} />);
    await user.click(screen.getByText("工具"));
    expect(onChange).toHaveBeenCalledWith("tools");
  });

  it("Tab 支持键盘导航（ArrowRight 切换）", async () => {
    const user = userEvent.setup();
    render(<TestTabs />);
    const firstTab = screen.getByRole("tab", { name: "全部" });
    firstTab.focus();
    await user.keyboard("{ArrowRight}");
    expect(document.activeElement?.textContent).toBe("编程");
  });

  it("button-brand-horizontal variant tab 含圆角样式", () => {
    render(
      <Tabs defaultSelectedKey="a">
        <TabsList variant="button-brand-horizontal">
          <TabsItem id="a">A</TabsItem>
        </TabsList>
      </Tabs>,
    );
    const tab = screen.getByRole("tab", { name: "A" });
    expect(tab.className).toContain("rounded-full");
  });

  it("underline variant tablist 含 border-b 样式", () => {
    render(
      <Tabs defaultSelectedKey="a">
        <TabsList variant="underline">
          <TabsItem id="a" variant="underline">
            A
          </TabsItem>
        </TabsList>
      </Tabs>,
    );
    const tablist = screen.getByRole("tablist");
    expect(tablist.className).toContain("border-b");
  });

  it("无面板时 Tabs 仅作选择器正常运行", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <Tabs defaultSelectedKey="all" onSelectionChange={(k) => onChange(String(k))}>
        <TabsList>
          <TabsItem id="all">全部</TabsItem>
          <TabsItem id="coding">编程</TabsItem>
        </TabsList>
      </Tabs>,
    );
    await user.click(screen.getByText("编程"));
    expect(onChange).toHaveBeenCalledWith("coding");
  });

  it("underline variant tablist 含 overflow-x-auto 横向滚动样式", () => {
    render(
      <Tabs defaultSelectedKey="a">
        <TabsList variant="underline">
          <TabsItem id="a" variant="underline">
            A
          </TabsItem>
        </TabsList>
      </Tabs>,
    );
    const tablist = screen.getByRole("tablist");
    expect(tablist.className).toContain("overflow-x-auto");
  });

  it("underline variant tab 含 whitespace-nowrap 防止文字折行", () => {
    render(
      <Tabs defaultSelectedKey="a">
        <TabsList variant="underline">
          <TabsItem id="a" variant="underline">
            A
          </TabsItem>
        </TabsList>
      </Tabs>,
    );
    const tab = screen.getByRole("tab", { name: "A" });
    expect(tab.className).toContain("whitespace-nowrap");
  });
});

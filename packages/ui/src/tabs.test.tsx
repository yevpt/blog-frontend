import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Tabs, TabsList, TabsItem, TabsPanel } from "./tabs";

function TestTabs({ onSelectionChange }: { onSelectionChange?: (key: string) => void }) {
  return (
    <Tabs defaultSelectedKey="all" onSelectionChange={(k) => onSelectionChange?.(String(k))}>
      <TabsList variant="button-brand-horizontal">
        <TabsItem id="all">全部</TabsItem>
        <TabsItem id="coding">编程</TabsItem>
        <TabsItem id="tools">工具</TabsItem>
      </TabsList>
      <TabsPanel id="all">全部内容</TabsPanel>
      <TabsPanel id="coding">编程内容</TabsPanel>
      <TabsPanel id="tools">工具内容</TabsPanel>
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

  it("underline variant tab 含 border-b-2 类", () => {
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
    expect(tab.className).toContain("border-b-2");
  });
});

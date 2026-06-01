import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Button } from "./button";

describe("Button", () => {
  it("渲染不崩溃，显示文字", () => {
    render(<Button>点击</Button>);
    expect(screen.getByRole("button", { name: "点击" })).toBeTruthy();
  });

  it("所有 variant 均包含 cursor-pointer", () => {
    const variants = ["default", "outline", "ghost"] as const;
    for (const variant of variants) {
      const { container } = render(<Button variant={variant}>按钮</Button>);
      expect(container.querySelector("button")?.className).toContain("cursor-pointer");
      container.remove();
    }
  });

  it("不覆盖 React Aria 的移动端触摸策略", () => {
    const { container } = render(<Button>移动端按钮</Button>);
    expect(container.querySelector("button")?.className).not.toContain("touch-manipulation");
  });

  it("outline variant 含 border 类", () => {
    const { container } = render(<Button variant="outline">边框</Button>);
    expect(container.querySelector("button")?.className).toContain("border");
  });

  it("ghost variant 含 hover:bg-accent", () => {
    const { container } = render(<Button variant="ghost">幽灵</Button>);
    expect(container.querySelector("button")?.className).toContain("hover:bg-accent");
  });

  it("size sm 含 h-8", () => {
    const { container } = render(<Button size="sm">小</Button>);
    expect(container.querySelector("button")?.className).toContain("h-8");
  });

  it("onPress 回调触发", async () => {
    const user = userEvent.setup();
    const handlePress = vi.fn();
    render(<Button onPress={handlePress}>点我</Button>);
    await user.click(screen.getByRole("button", { name: "点我" }));
    expect(handlePress).toHaveBeenCalledOnce();
  });

  it("isDisabled 时不触发 onPress", async () => {
    const user = userEvent.setup();
    const handlePress = vi.fn();
    render(
      <Button isDisabled onPress={handlePress}>
        禁用
      </Button>,
    );
    await user.click(screen.getByRole("button", { name: "禁用" }));
    expect(handlePress).not.toHaveBeenCalled();
  });

  it("href prop 渲染为 <a>（Link 语义）", () => {
    const { container } = render(<Button href="/about">链接</Button>);
    expect(container.querySelector("a")).toBeTruthy();
    expect(container.querySelector("button")).toBeNull();
  });

  it("className 透传，rounded-full 覆盖 rounded-md（tailwind-merge）", () => {
    const { container } = render(
      <Button size="sm" className="rounded-full">
        圆
      </Button>,
    );
    const cls = container.querySelector("button")?.className ?? "";
    expect(cls).toContain("rounded-full");
    expect(cls).not.toContain("rounded-md");
  });
});

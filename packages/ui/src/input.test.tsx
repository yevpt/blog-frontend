import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Input } from "./input";

// happy-dom 环境 SvgIcon 依赖 SVG sprite；mock @repo/icons
vi.mock("@repo/icons", () => ({
  SvgIcon: ({ name }: { name: string }) => <span data-testid={`icon-${name}`} />,
}));

describe("Input", () => {
  it("渲染不崩溃", () => {
    render(<Input placeholder="请输入" />);
    expect(screen.getByPlaceholderText("请输入")).toBeTruthy();
  });

  it("label 渲染", () => {
    render(<Input label="邮箱" placeholder="test" />);
    expect(screen.getByText("邮箱")).toBeTruthy();
  });

  it("label 为空时不渲染 label 元素", () => {
    const { container } = render(<Input placeholder="test" />);
    expect(container.querySelector("label")).toBeNull();
  });

  it("iconName 渲染图标", () => {
    render(<Input iconName="search" placeholder="搜索" />);
    expect(screen.getByTestId("icon-search")).toBeTruthy();
  });

  it("hint 显示提示文字", () => {
    render(<Input hint="这是提示" placeholder="test" />);
    expect(screen.getByText("这是提示")).toBeTruthy();
  });

  it("onChange 返回 string 值（非 ChangeEvent）", () => {
    const onChange = vi.fn();
    render(<Input placeholder="test" onChange={onChange} />);
    const input = screen.getByPlaceholderText("test");
    fireEvent.change(input, { target: { value: "hello" } });
    expect(onChange).toHaveBeenCalledWith("hello");
  });

  it("isInvalid 时不显示 hint", () => {
    render(<Input isInvalid hint="提示" placeholder="test" />);
    expect(screen.queryByText("提示")).toBeNull();
  });

  it("size sm 含 h-9", () => {
    const { container } = render(<Input size="sm" placeholder="s" />);
    expect(container.querySelector("input")?.className).toContain("h-9");
  });

  it("size md 含 h-10", () => {
    const { container } = render(<Input size="md" placeholder="m" />);
    expect(container.querySelector("input")?.className).toContain("h-10");
  });
});

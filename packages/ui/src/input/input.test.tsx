import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("@repo/icons", () => ({
  SvgIcon: ({ name }: { name: string }) => <span data-testid={`icon-${name}`} />,
  SvgSprite: () => null,
}));

vi.mock("../tooltip/tooltip", () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

import { Input } from "./input";

describe("Input", () => {
  it("渲染不崩溃", () => {
    render(<Input aria-label="测试" />);
    expect(screen.getByRole("textbox")).toBeTruthy();
  });

  it("显示 label", () => {
    render(<Input label="邮箱" />);
    expect(screen.getByText("邮箱")).toBeTruthy();
  });

  it("显示 placeholder", () => {
    render(<Input aria-label="测试" placeholder="请输入..." />);
    expect(screen.getByPlaceholderText("请输入...")).toBeTruthy();
  });

  it("isInvalid 时 input 有 aria-invalid 属性", () => {
    render(<Input aria-label="测试" isInvalid validate={() => "必填"} />);
    const input = screen.getByRole("textbox");
    expect(input).toHaveAttribute("aria-invalid", "true");
  });

  it("type=password 时渲染密码切换按钮", () => {
    render(<Input aria-label="密码" type="password" />);
    expect(screen.getByRole("button", { name: "显示密码" })).toBeTruthy();
    expect(screen.getByTestId("icon-eye")).toBeTruthy();
  });

  it("点击密码切换按钮后显示 eye-off 图标", async () => {
    const user = userEvent.setup();
    render(<Input aria-label="密码" type="password" />);
    await user.click(screen.getByRole("button", { name: "显示密码" }));
    expect(screen.getByTestId("icon-eye-off")).toBeTruthy();
    expect(screen.getByRole("button", { name: "隐藏密码" })).toBeTruthy();
  });
});

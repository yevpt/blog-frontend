import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Checkbox, CheckboxBase } from "./checkbox";

describe("CheckboxBase", () => {
  it("渲染不崩溃", () => {
    const { container } = render(<CheckboxBase />);
    expect(container.firstChild).toBeTruthy();
  });

  it("isSelected 时有选中样式类", () => {
    const { container } = render(<CheckboxBase isSelected />);
    const el = container.firstChild as HTMLElement;
    expect(el.className).toContain("bg-blue-600");
  });
});

describe("Checkbox", () => {
  it("渲染为 checkbox 角色", () => {
    render(<Checkbox aria-label="同意" />);
    expect(screen.getByRole("checkbox")).toBeTruthy();
  });

  it("显示 label 文字", () => {
    render(<Checkbox label="我同意条款" />);
    expect(screen.getByText("我同意条款")).toBeTruthy();
  });

  it("显示 hint 文字", () => {
    render(<Checkbox label="选项" hint="这是提示" />);
    expect(screen.getByText("这是提示")).toBeTruthy();
  });

  it("点击触发 onChange", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Checkbox aria-label="同意" onChange={onChange} />);
    await user.click(screen.getByRole("checkbox"));
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it("isDisabled 时无法交互", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Checkbox aria-label="同意" isDisabled onChange={onChange} />);
    await user.click(screen.getByRole("checkbox"));
    expect(onChange).not.toHaveBeenCalled();
  });
});

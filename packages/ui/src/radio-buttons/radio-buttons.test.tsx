import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RadioButton, RadioGroup, RadioButtonBase } from "./radio-buttons";

describe("RadioButtonBase", () => {
  it("渲染不崩溃", () => {
    const { container } = render(<RadioButtonBase />);
    expect(container.firstChild).toBeTruthy();
  });
});

describe("RadioGroup + RadioButton", () => {
  it("渲染 radiogroup 角色", () => {
    render(
      <RadioGroup aria-label="选项">
        <RadioButton value="a" label="选项 A" />
        <RadioButton value="b" label="选项 B" />
      </RadioGroup>,
    );
    expect(screen.getByRole("radiogroup")).toBeTruthy();
  });

  it("显示所有选项", () => {
    render(
      <RadioGroup aria-label="选项">
        <RadioButton value="a" label="选项 A" />
        <RadioButton value="b" label="选项 B" />
      </RadioGroup>,
    );
    expect(screen.getByText("选项 A")).toBeTruthy();
    expect(screen.getByText("选项 B")).toBeTruthy();
  });

  it("点击切换选中", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <RadioGroup aria-label="选项" onChange={onChange}>
        <RadioButton value="a" label="选项 A" />
        <RadioButton value="b" label="选项 B" />
      </RadioGroup>,
    );
    await user.click(screen.getByText("选项 B"));
    expect(onChange).toHaveBeenCalledWith("b");
  });

  it("isDisabled 的选项无法选中", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <RadioGroup aria-label="选项" onChange={onChange}>
        <RadioButton value="a" label="选项 A" isDisabled />
        <RadioButton value="b" label="选项 B" />
      </RadioGroup>,
    );
    await user.click(screen.getByText("选项 A"));
    expect(onChange).not.toHaveBeenCalled();
  });
});

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Toggle } from "./toggle";

describe("Toggle", () => {
  it("渲染不崩溃", () => {
    render(<Toggle aria-label="开关" />);
    expect(screen.getByRole("switch")).toBeTruthy();
  });

  it("显示 label 文字", () => {
    render(<Toggle label="启用通知" />);
    expect(screen.getByText("启用通知")).toBeTruthy();
  });

  it("显示 hint 文字", () => {
    render(<Toggle label="开关" hint="这是提示" />);
    expect(screen.getByText("这是提示")).toBeTruthy();
  });

  it("点击触发 onChange", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Toggle aria-label="开关" onChange={onChange} />);
    await user.click(screen.getByRole("switch"));
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it("受控：isSelected=true 时 switch checked", () => {
    render(<Toggle aria-label="开关" isSelected={true} onChange={vi.fn()} />);
    // react-aria Switch 渲染为 <input type="checkbox" role="switch">，使用 checked 而非 aria-checked
    expect(screen.getByRole("switch")).toBeChecked();
  });

  it("disabled 时无法交互", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Toggle aria-label="开关" isDisabled onChange={onChange} />);
    await user.click(screen.getByRole("switch"));
    expect(onChange).not.toHaveBeenCalled();
  });
});

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CodeDialog } from "./code-dialog";

describe("CodeDialog", () => {
  it("open=false 时不渲染", () => {
    render(<CodeDialog open={false} onClose={() => {}} onConfirm={() => {}} />);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("open=true 时渲染代码输入区和语言选择器", () => {
    render(<CodeDialog open onClose={() => {}} onConfirm={() => {}} />);
    expect(screen.getByRole("textbox", { name: /代码内容/i })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: /语言/i })).toBeInTheDocument();
  });

  it("代码为空时确认按钮禁用", () => {
    render(<CodeDialog open onClose={() => {}} onConfirm={() => {}} />);
    expect(screen.getByRole("button", { name: /插入/i })).toBeDisabled();
  });

  it("填写代码并选择语言后，点击确认触发 onConfirm(code, lang)", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(<CodeDialog open onClose={() => {}} onConfirm={onConfirm} />);
    await user.type(screen.getByRole("textbox", { name: /代码内容/i }), "console.log(1)");
    await user.selectOptions(screen.getByRole("combobox", { name: /语言/i }), "javascript");
    await user.click(screen.getByRole("button", { name: /插入/i }));
    expect(onConfirm).toHaveBeenCalledWith("console.log(1)", "javascript");
  });

  it("点击取消触发 onClose", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<CodeDialog open onClose={onClose} onConfirm={() => {}} />);
    await user.click(screen.getByRole("button", { name: /取消/i }));
    expect(onClose).toHaveBeenCalledOnce();
  });
});

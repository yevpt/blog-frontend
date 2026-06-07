import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LinkDialog } from "./link-dialog";

describe("LinkDialog", () => {
  it("open=false 时不渲染", () => {
    render(<LinkDialog open={false} onClose={() => {}} onConfirm={() => {}} />);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("open=true 时渲染 URL 和链接文字输入框", () => {
    render(<LinkDialog open onClose={() => {}} onConfirm={() => {}} />);
    expect(screen.getByPlaceholderText(/https:\/\//i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/链接文字/i)).toBeInTheDocument();
  });

  it("URL 为空时确认按钮禁用", () => {
    render(<LinkDialog open onClose={() => {}} onConfirm={() => {}} />);
    expect(screen.getByRole("button", { name: /插入/i })).toBeDisabled();
  });

  it("填写 URL 和文字后点击确认，触发 onConfirm(url, title)", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(<LinkDialog open onClose={() => {}} onConfirm={onConfirm} />);
    await user.type(screen.getByPlaceholderText(/https:\/\//i), "https://example.com");
    await user.type(screen.getByPlaceholderText(/链接文字/i), "示例链接");
    await user.click(screen.getByRole("button", { name: /插入/i }));
    expect(onConfirm).toHaveBeenCalledWith("https://example.com", "示例链接");
  });

  it("点击取消触发 onClose", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<LinkDialog open onClose={onClose} onConfirm={() => {}} />);
    await user.click(screen.getByRole("button", { name: /取消/i }));
    expect(onClose).toHaveBeenCalledOnce();
  });
});

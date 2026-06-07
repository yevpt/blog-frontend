import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ImageDialog } from "./image-dialog";

describe("ImageDialog", () => {
  it("open=false 时不渲染内容", () => {
    render(<ImageDialog open={false} onClose={() => {}} onConfirm={() => {}} />);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("open=true 时渲染 URL 输入框和描述输入框", () => {
    render(<ImageDialog open onClose={() => {}} onConfirm={() => {}} />);
    expect(screen.getByPlaceholderText(/https:\/\//i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/图片描述/i)).toBeInTheDocument();
  });

  it("URL 为空时确认按钮禁用", () => {
    render(<ImageDialog open onClose={() => {}} onConfirm={() => {}} />);
    expect(screen.getByRole("button", { name: /插入/i })).toBeDisabled();
  });

  it("填写 URL 后点击确认，触发 onConfirm(url, alt)", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(<ImageDialog open onClose={() => {}} onConfirm={onConfirm} />);
    await user.type(screen.getByPlaceholderText(/https:\/\//i), "https://example.com/img.png");
    await user.type(screen.getByPlaceholderText(/图片描述/i), "示例图片");
    await user.click(screen.getByRole("button", { name: /插入/i }));
    expect(onConfirm).toHaveBeenCalledWith("https://example.com/img.png", "示例图片");
  });

  it("点击取消触发 onClose", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<ImageDialog open onClose={onClose} onConfirm={() => {}} />);
    await user.click(screen.getByRole("button", { name: /取消/i }));
    expect(onClose).toHaveBeenCalledOnce();
  });
});

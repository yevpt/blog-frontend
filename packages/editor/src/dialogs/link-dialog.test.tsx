import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LinkDialog } from "./link-dialog";

describe("Editor LinkDialog", () => {
  it("open=false 时不渲染 dialog", () => {
    render(<LinkDialog open={false} onClose={() => {}} onConfirm={() => {}} />);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("open=true 时渲染插入链接弹窗", () => {
    render(<LinkDialog open onClose={() => {}} onConfirm={() => {}} />);
    expect(screen.getByRole("dialog", { name: "插入链接" })).toBeInTheDocument();
  });

  it("填写 URL 和标题后点击插入触发 onConfirm", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(<LinkDialog open onClose={() => {}} onConfirm={onConfirm} />);

    await user.type(screen.getByPlaceholderText(/https:\/\//i), "https://example.com");
    await user.type(screen.getByPlaceholderText(/链接文字/i), "示例链接");
    await user.click(screen.getByRole("button", { name: "插入" }));

    expect(onConfirm).toHaveBeenCalledWith("https://example.com", "示例链接");
  });
});

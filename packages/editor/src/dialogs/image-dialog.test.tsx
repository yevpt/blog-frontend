import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ImageDialog } from "./image-dialog";

describe("Editor ImageDialog", () => {
  it("open=false 时不渲染 dialog", () => {
    render(<ImageDialog open={false} onClose={() => {}} onConfirm={() => {}} />);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("open=true 时渲染插入图片弹窗", () => {
    render(<ImageDialog open onClose={() => {}} onConfirm={() => {}} />);
    expect(screen.getByRole("dialog", { name: "插入图片" })).toBeInTheDocument();
  });

  it("填写 URL 后点击插入触发 onConfirm", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(<ImageDialog open onClose={() => {}} onConfirm={onConfirm} />);

    await user.type(screen.getByPlaceholderText(/https:\/\//i), "https://example.com/a.png");
    await user.click(screen.getByRole("button", { name: "插入" }));

    expect(onConfirm).toHaveBeenCalledWith("https://example.com/a.png", undefined);
  });
});

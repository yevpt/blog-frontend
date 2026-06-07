import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RichEditor } from "../RichEditor";

describe("RichEditor", () => {
  it("渲染不崩溃，EditorContent 挂载成功", () => {
    const { container } = render(<RichEditor value="" onChange={() => {}} />);
    // Tiptap EditorContent 会渲染一个 contenteditable div
    expect(container.querySelector("[contenteditable]")).toBeTruthy();
  });

  it("传入 placeholder 时在编辑器上有对应 data-placeholder 属性", () => {
    const { container } = render(
      <RichEditor value="" onChange={() => {}} placeholder="写下你的评论..." />,
    );
    // data-placeholder 应在 .tiptap 元素上（用于 CSS ::before 占位文字）
    const tiptap = container.querySelector(".tiptap[data-placeholder]");
    expect(tiptap?.getAttribute("data-placeholder")).toBe("写下你的评论...");
  });

  it("disabled=true 时 contenteditable 为 false", () => {
    const { container } = render(<RichEditor value="" onChange={() => {}} disabled />);
    const ce = container.querySelector("[contenteditable]");
    expect(ce?.getAttribute("contenteditable")).toBe("false");
  });

  it("onSubmit 存在时渲染发送按钮", () => {
    render(<RichEditor value="" onChange={() => {}} onSubmit={() => {}} />);
    expect(screen.getByRole("button", { name: "发送评论" })).toBeInTheDocument();
  });

  it("onInsertImage 未提供时不渲染图片按钮", () => {
    render(<RichEditor value="" onChange={() => {}} />);
    expect(screen.queryByRole("button", { name: "插入图片" })).toBeNull();
  });

  it("onInsertImage 提供时渲染图片按钮并触发 handler", async () => {
    const handler = vi.fn();
    const user = userEvent.setup();
    render(<RichEditor value="" onChange={() => {}} onInsertImage={handler} />);
    const btn = screen.getByRole("button", { name: "插入图片" });
    await user.click(btn);
    expect(handler).toHaveBeenCalledOnce();
  });
});

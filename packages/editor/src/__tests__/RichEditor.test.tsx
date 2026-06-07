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

  it("传入 placeholder 时在空段落上有对应 data-placeholder 属性和空态 class", () => {
    const { container } = render(
      <RichEditor value="" onChange={() => {}} placeholder="写下你的评论..." />,
    );
    const placeholderNode = container.querySelector(".tiptap [data-placeholder]");
    expect(placeholderNode?.getAttribute("data-placeholder")).toBe("写下你的评论...");
    expect(placeholderNode).toHaveClass("is-editor-empty");
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

  it("使用语义色令牌的圆角面板，且不会在聚焦时改变边框颜色", () => {
    const { container } = render(<RichEditor value="" onChange={() => {}} onSubmit={() => {}} />);
    const root = container.firstElementChild;
    const editorArea = root?.querySelector("[data-rich-editor-area]");

    expect(root).toHaveClass("rounded-xl", "bg-muted");
    expect(root?.className).not.toContain("focus-within:border-primary");
    expect(editorArea).toHaveClass("min-h-[88px]");
    expect(editorArea?.className).toContain("[&_.tiptap]:min-h-[88px]");
  });

  it("提交按钮显示为右侧主题色胶囊按钮", () => {
    render(<RichEditor value="" onChange={() => {}} onSubmit={() => {}} />);

    const submitButton = screen.getByRole("button", { name: "发送评论" });
    expect(submitButton).toHaveClass("h-8", "rounded-full", "bg-primary");
    expect(submitButton).toHaveTextContent("提交");
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

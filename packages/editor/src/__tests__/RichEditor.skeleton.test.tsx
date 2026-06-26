import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { RichEditor } from "../RichEditor";

vi.mock("../hooks/use-rich-editor", () => ({
  useRichEditor: () => null,
}));

describe("RichEditor skeleton", () => {
  it("card 变体复用编辑区 class，并在底部渲染完整工具栏占位", () => {
    const { container } = render(
      <RichEditor
        value=""
        onChange={() => {}}
        onSubmit={() => {}}
        onInsertLink={() => {}}
        onInsertImage={() => {}}
      />,
    );

    const skeleton = container.querySelector("[data-rich-editor-skeleton]");
    const editorArea = container.querySelector("[data-rich-editor-area]");

    expect(skeleton).toBeTruthy();
    expect(editorArea).toHaveClass("min-h-[88px]");
    expect(editorArea?.className).toContain("[&_.tiptap]:min-h-[88px]");

    const toolbarBones = skeleton?.querySelectorAll(".h-7.w-7");
    expect(toolbarBones?.length).toBe(6);
    expect(skeleton?.querySelector(".rounded-full")).toBeTruthy();
  });

  it("plain + toolbarPlacement=top 时工具栏在上方且按钮为 30px", () => {
    const { container } = render(
      <RichEditor
        value=""
        onChange={() => {}}
        variant="plain"
        toolbarPlacement="top"
        onInsertLink={() => {}}
        onInsertImage={() => {}}
      />,
    );

    const skeleton = container.querySelector("[data-rich-editor-skeleton]");
    const toolbarBones = skeleton?.querySelectorAll(".size-\\[30px\\]");
    expect(toolbarBones?.length).toBe(6);
    expect(skeleton?.querySelector(".mt-1\\.5")).toBeNull();
  });

  it("header 传入时渲染回复条占位", () => {
    const { container } = render(
      <RichEditor
        value=""
        onChange={() => {}}
        onSubmit={() => {}}
        header={<span>回复 @Alice</span>}
      />,
    );

    const editorArea = container.querySelector("[data-rich-editor-area]");
    expect(editorArea?.className).toContain("[&_.tiptap]:min-h-[64px]");
    expect(editorArea?.querySelector(".h-3.w-28")).toBeTruthy();
  });
});

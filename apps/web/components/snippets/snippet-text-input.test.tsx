import { render, screen } from "@testing-library/react";
import { beforeEach, describe, it, expect, vi } from "vitest";

const richEditorProps = vi.fn();
vi.mock("@repo/editor", () => ({
  RichEditor: (props: Record<string, unknown>) => {
    richEditorProps(props);
    return <textarea aria-label="编辑器" />;
  },
  LinkDialog: () => null,
  CodeDialog: () => null,
}));
import { SnippetTextInput } from "./snippet-text-input";

describe("SnippetTextInput", () => {
  beforeEach(() => {
    richEditorProps.mockClear();
  });

  it("隐藏图片按钮：不向 RichEditor 传 onInsertImage，但传链接/代码 handler", () => {
    render(<SnippetTextInput value="" onChange={() => {}} />);
    const props = richEditorProps.mock.calls[0][0];
    expect(props.onInsertImage).toBeUndefined();
    expect(typeof props.onInsertLink).toBe("function");
    expect(typeof props.onInsertCode).toBe("function");
    expect(props.onSubmit).toBeUndefined();
    expect(screen.getByLabelText("编辑器")).toBeInTheDocument();
  });

  it("向 RichEditor 透传 maxLength 以启用富文本输入限制", () => {
    render(<SnippetTextInput value="" onChange={() => {}} maxLength={800} />);
    const props = richEditorProps.mock.calls[0][0];
    expect(props.maxLength).toBe(800);
  });

  it("在工具栏显示字数统计", () => {
    render(<SnippetTextInput value="" onChange={() => {}} maxLength={800} />);
    const props = richEditorProps.mock.calls[0][0];
    expect(props.showToolbarCharacterCount).not.toBe(false);
  });
});

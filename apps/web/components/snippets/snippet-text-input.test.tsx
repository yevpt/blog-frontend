import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

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
  it("隐藏图片按钮：不向 RichEditor 传 onInsertImage，但传链接/代码 handler", () => {
    render(<SnippetTextInput value="" onChange={() => {}} />);
    const props = richEditorProps.mock.calls[0][0];
    expect(props.onInsertImage).toBeUndefined();
    expect(typeof props.onInsertLink).toBe("function");
    expect(typeof props.onInsertCode).toBe("function");
    expect(props.onSubmit).toBeUndefined();
    expect(screen.getByLabelText("编辑器")).toBeInTheDocument();
  });
});

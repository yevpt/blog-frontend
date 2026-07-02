import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ModerationCorrectContentEditor } from "./ModerationCorrectContentEditor";

const richEditorProps = vi.hoisted(() => ({ last: null as Record<string, unknown> | null }));

vi.mock("@repo/editor", () => ({
  RichEditor: (props: Record<string, unknown>) => {
    richEditorProps.last = props;
    return <div data-testid="rich-editor" />;
  },
  LinkDialog: () => null,
}));

vi.mock("@repo/hooks", () => ({
  useEditorImageUpload: () => ({
    inputRef: { current: null },
    handleInsertImageRequest: vi.fn(),
    handleFileChange: vi.fn(),
  }),
}));

vi.mock("../../../lib/api", () => ({
  apiClient: { uploads: { tempImage: vi.fn() } },
}));

vi.mock("../../../lib/toast", () => ({
  addToast: vi.fn(),
}));

describe("ModerationCorrectContentEditor", () => {
  it("碎语使用 moment 字数上限且无插图按钮", () => {
    render(
      <ModerationCorrectContentEditor contentType="moment" value="原文" onChange={() => {}} />,
    );

    expect(screen.getByText("修正正文")).toBeInTheDocument();
    expect(richEditorProps.last?.maxLength).toBe(800);
    expect(richEditorProps.last?.onInsertImage).toBeUndefined();
    expect(richEditorProps.last?.onInsertLink).toBeTypeOf("function");
  });

  it("留言类启用插图上传与 2000 字上限", () => {
    render(
      <ModerationCorrectContentEditor contentType="guestbook" value="原文" onChange={() => {}} />,
    );

    expect(richEditorProps.last?.maxLength).toBe(2000);
    expect(richEditorProps.last?.onInsertImage).toBeTypeOf("function");
  });
});

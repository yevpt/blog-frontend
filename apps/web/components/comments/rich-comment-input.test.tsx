import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RichCommentInput } from "./rich-comment-input";

// mock @repo/editor 避免 Tiptap DOM 依赖问题
vi.mock("@repo/editor", () => ({
  ImageDialog: ({ open }: { open: boolean }) =>
    open ? (
      <div role="dialog" aria-label="插入图片">
        插入图片
      </div>
    ) : null,
  LinkDialog: ({ open }: { open: boolean }) =>
    open ? (
      <div role="dialog" aria-label="插入链接">
        插入链接
      </div>
    ) : null,
  CodeDialog: ({ open }: { open: boolean }) =>
    open ? (
      <div role="dialog" aria-label="插入代码块">
        插入代码块
      </div>
    ) : null,
  RichEditor: ({
    onSubmit,
    onInsertImage,
    onInsertLink,
    onInsertCode,
  }: {
    onSubmit?: () => void;
    onInsertImage?: (insert: (url: string, alt?: string) => void) => void;
    onInsertLink?: (insert: (url: string, title?: string) => void) => void;
    onInsertCode?: (insert: (code: string, lang: string) => void) => void;
  }) => (
    <div data-testid="rich-editor">
      <button onClick={onSubmit}>发送</button>
      <button onClick={() => onInsertImage?.((_url, _alt) => {})}>插入图片</button>
      <button onClick={() => onInsertLink?.((_url, _title) => {})}>插入链接</button>
      <button onClick={() => onInsertCode?.((_code, _lang) => {})}>插入代码</button>
    </div>
  ),
}));

describe("RichCommentInput", () => {
  it("渲染 RichEditor", () => {
    render(<RichCommentInput value="" onChange={() => {}} onSubmit={() => {}} />);
    expect(screen.getByTestId("rich-editor")).toBeInTheDocument();
  });

  it("点击插入图片按钮后，ImageDialog 打开", async () => {
    const user = userEvent.setup();
    render(<RichCommentInput value="" onChange={() => {}} onSubmit={() => {}} />);
    await user.click(screen.getByText("插入图片"));
    expect(screen.getByRole("dialog", { name: "插入图片" })).toBeInTheDocument();
  });

  it("点击插入链接按钮后，LinkDialog 打开", async () => {
    const user = userEvent.setup();
    render(<RichCommentInput value="" onChange={() => {}} onSubmit={() => {}} />);
    await user.click(screen.getByText("插入链接"));
    expect(screen.getByRole("dialog", { name: "插入链接" })).toBeInTheDocument();
  });

  it("点击插入代码按钮后，CodeDialog 打开", async () => {
    const user = userEvent.setup();
    render(<RichCommentInput value="" onChange={() => {}} onSubmit={() => {}} />);
    await user.click(screen.getByText("插入代码"));
    expect(screen.getByRole("dialog", { name: "插入代码块" })).toBeInTheDocument();
  });
});

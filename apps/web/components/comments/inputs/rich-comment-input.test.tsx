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
    value,
    onSubmit,
    onInsertImage,
    onInsertLink,
    onInsertCode,
  }: {
    value?: string;
    onSubmit?: () => void;
    onInsertImage?: (insert: (url: string, alt?: string) => void) => void;
    onInsertLink?: (insert: (url: string, title?: string) => void) => void;
    onInsertCode?: (insert: (code: string, lang: string) => void) => void;
  }) => (
    <div data-testid="rich-editor" data-value={value}>
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

  it("未传 maxLength 时不渲染计数器", () => {
    render(<RichCommentInput value="短内容" onChange={() => {}} onSubmit={() => {}} />);
    expect(screen.queryByText(/\d+\/\d+/)).toBeNull();
  });

  it("maxLength 传入但未接近上限时不渲染计数器", () => {
    render(
      <RichCommentInput value="短内容" maxLength={2000} onChange={() => {}} onSubmit={() => {}} />,
    );
    expect(screen.queryByText(/\d+\/\d+/)).toBeNull();
  });

  it("maxLength 传入且接近上限时显示 当前长度/上限 计数器", () => {
    const nearLimit = "x".repeat(1900);
    render(
      <RichCommentInput
        value={nearLimit}
        maxLength={2000}
        onChange={() => {}}
        onSubmit={() => {}}
      />,
    );
    expect(screen.getByText("1900/2000")).toBeInTheDocument();
  });

  it("达到上限时计数器仍展示且反映满额", () => {
    const atLimit = "x".repeat(2000);
    render(
      <RichCommentInput value={atLimit} maxLength={2000} onChange={() => {}} onSubmit={() => {}} />,
    );
    expect(screen.getByText("2000/2000")).toBeInTheDocument();
  });
});

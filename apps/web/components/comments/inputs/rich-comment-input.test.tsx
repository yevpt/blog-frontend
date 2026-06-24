import { beforeEach, describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RichCommentInput } from "./rich-comment-input";

const richEditorProps = vi.hoisted(() => vi.fn());

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
  RichEditor: ({
    value,
    onSubmit,
    submitDisabled,
    onInsertImage,
    onInsertLink,
    maxLength,
    characterCountThreshold,
  }: {
    value?: string;
    onSubmit?: () => void;
    submitDisabled?: boolean;
    maxLength?: number;
    characterCountThreshold?: number;
    onInsertImage?: (insert: (url: string, alt?: string) => void) => void;
    onInsertLink?: (insert: (url: string, title?: string) => void) => void;
  }) => {
    richEditorProps({ value, submitDisabled, maxLength, characterCountThreshold });
    const showCounter =
      maxLength != null &&
      value != null &&
      (characterCountThreshold == null || value.length >= maxLength - characterCountThreshold);

    return (
      <div data-testid="rich-editor" data-value={value}>
        <button onClick={onSubmit} disabled={submitDisabled}>
          发送
        </button>
        {showCounter && (
          <span data-testid="rich-editor-counter">
            {value.length}/{maxLength}
          </span>
        )}
        <button onClick={() => onInsertImage?.((_url, _alt) => {})}>插入图片</button>
        <button onClick={() => onInsertLink?.((_url, _title) => {})}>插入链接</button>
      </div>
    );
  },
}));

describe("RichCommentInput", () => {
  beforeEach(() => {
    richEditorProps.mockClear();
  });

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

  it("未传 maxLength 时不渲染计数器", () => {
    render(<RichCommentInput value="短内容" onChange={() => {}} onSubmit={() => {}} />);
    expect(screen.queryByText(/\d+\/\d+/)).toBeNull();
    expect(richEditorProps).toHaveBeenLastCalledWith(
      expect.objectContaining({ maxLength: undefined }),
    );
  });

  it("maxLength 传入但未接近上限时不渲染编辑器内部计数器", () => {
    render(
      <RichCommentInput value="短内容" maxLength={2000} onChange={() => {}} onSubmit={() => {}} />,
    );
    expect(screen.queryByText(/\d+\/\d+/)).toBeNull();
    expect(richEditorProps).toHaveBeenLastCalledWith(
      expect.objectContaining({ maxLength: 2000, characterCountThreshold: 100 }),
    );
  });

  it("maxLength 传入且接近上限时显示编辑器内部计数器", () => {
    const nearLimit = "x".repeat(1900);
    render(
      <RichCommentInput
        value={nearLimit}
        maxLength={2000}
        onChange={() => {}}
        onSubmit={() => {}}
      />,
    );
    expect(within(screen.getByTestId("rich-editor")).getByText("1900/2000")).toBeInTheDocument();
  });

  it("达到上限时编辑器内部计数器仍展示且反映满额", () => {
    const atLimit = "x".repeat(2000);
    render(
      <RichCommentInput value={atLimit} maxLength={2000} onChange={() => {}} onSubmit={() => {}} />,
    );
    expect(within(screen.getByTestId("rich-editor")).getByText("2000/2000")).toBeInTheDocument();
  });

  it("达到上限内（含等于）不禁用发送", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    const atLimit = "x".repeat(2000);
    render(
      <RichCommentInput value={atLimit} maxLength={2000} onChange={() => {}} onSubmit={onSubmit} />,
    );
    const sendBtn = screen.getByText("发送");
    expect(sendBtn).not.toBeDisabled();
    await user.click(sendBtn);
    expect(onSubmit).toHaveBeenCalledOnce();
  });

  it("超出上限时禁用发送、保留编辑器内部计数器，且点击不触发提交", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    const overLimit = "x".repeat(2001);
    render(
      <RichCommentInput
        value={overLimit}
        maxLength={2000}
        onChange={() => {}}
        onSubmit={onSubmit}
      />,
    );
    const sendBtn = screen.getByText("发送");
    expect(sendBtn).toBeDisabled();

    expect(within(screen.getByTestId("rich-editor")).getByText("2001/2000")).toBeInTheDocument();
    expect(richEditorProps).toHaveBeenLastCalledWith(
      expect.objectContaining({ submitDisabled: true, maxLength: 2000 }),
    );

    await user.click(sendBtn);
    expect(onSubmit).not.toHaveBeenCalled();
  });
});

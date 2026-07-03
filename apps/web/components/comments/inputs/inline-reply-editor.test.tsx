// @vitest-environment jsdom
import React, { useState } from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { InlineReplyEditor, type InlineReplyEditorProps } from "./inline-reply-editor";

vi.mock("./rich-comment-input", () => ({
  RichCommentInput: ({
    value,
    onChange,
    onSubmit,
    isSubmitting,
    placeholder,
    header,
  }: {
    value: string;
    onChange: (v: string) => void;
    onSubmit: () => void;
    isSubmitting?: boolean;
    placeholder?: string;
    header?: React.ReactNode;
  }) => (
    <div data-testid="rich-input">
      {header}
      <span data-testid="placeholder">{placeholder}</span>
      <textarea data-testid="textarea" value={value} onChange={(e) => onChange(e.target.value)} />
      <button type="button" disabled={isSubmitting} onClick={onSubmit}>
        发送
      </button>
    </div>
  ),
}));

/** 测试用受控外壳：真实调用方（CommentItem 等）从 store 读写 value，这里用本地 state 模拟同样的受控关系 */
function ControlledHarness({
  initialValue = "",
  ...props
}: Omit<InlineReplyEditorProps, "value" | "onChange"> & { initialValue?: string }) {
  const [value, setValue] = useState(initialValue);
  return <InlineReplyEditor value={value} onChange={setValue} {...props} />;
}

describe("InlineReplyEditor", () => {
  it("渲染 value 作为内容", () => {
    render(
      <InlineReplyEditor
        value="草稿内容"
        onChange={vi.fn()}
        placeholder="写点什么"
        onSubmit={vi.fn().mockResolvedValue(true)}
      />,
    );
    expect(screen.getByTestId("textarea")).toHaveValue("草稿内容");
  });

  it("value 为空字符串时内容为空", () => {
    render(
      <InlineReplyEditor
        value=""
        onChange={vi.fn()}
        placeholder="写点什么"
        onSubmit={vi.fn().mockResolvedValue(true)}
      />,
    );
    expect(screen.getByTestId("textarea")).toHaveValue("");
  });

  it("输入时调用 onChange", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <InlineReplyEditor
        value=""
        onChange={onChange}
        placeholder="写点什么"
        onSubmit={vi.fn().mockResolvedValue(true)}
      />,
    );
    await user.type(screen.getByTestId("textarea"), "a");
    expect(onChange).toHaveBeenCalledWith("a");
  });

  it("渲染传入的 header", () => {
    render(
      <InlineReplyEditor
        value=""
        onChange={vi.fn()}
        placeholder="写点什么"
        header={<span data-testid="banner">回复 @Alice</span>}
        onSubmit={vi.fn().mockResolvedValue(true)}
      />,
    );
    expect(screen.getByTestId("banner")).toBeTruthy();
  });

  it("点击发送时用 trim 后的内容调用 onSubmit", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(true);
    render(<ControlledHarness placeholder="写点什么" onSubmit={onSubmit} />);

    await user.type(screen.getByTestId("textarea"), "  hello  ");
    await user.click(screen.getByText("发送"));

    expect(onSubmit).toHaveBeenCalledWith("hello");
  });

  it("内容为空白时点击发送不调用 onSubmit", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(true);
    render(<ControlledHarness placeholder="写点什么" onSubmit={onSubmit} />);

    await user.type(screen.getByTestId("textarea"), "   ");
    await user.click(screen.getByText("发送"));

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("提交进行中 RichCommentInput 收到 isSubmitting=true", async () => {
    const user = userEvent.setup();
    let resolveSubmit!: (v: boolean) => void;
    const onSubmit = vi.fn(() => new Promise<boolean>((resolve) => (resolveSubmit = resolve)));
    render(<ControlledHarness placeholder="写点什么" onSubmit={onSubmit} />);

    await user.type(screen.getByTestId("textarea"), "hello");
    await user.click(screen.getByText("发送"));

    expect(screen.getByText("发送")).toBeDisabled();
    resolveSubmit(true);
  });
});

// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { InlineReplyEditor } from "./inline-reply-editor";

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

describe("InlineReplyEditor", () => {
  it("渲染 initialValue 作为初始内容", () => {
    render(
      <InlineReplyEditor
        initialValue="草稿内容"
        placeholder="写点什么"
        onSubmit={vi.fn().mockResolvedValue(true)}
      />,
    );
    expect(screen.getByTestId("textarea")).toHaveValue("草稿内容");
  });

  it("无 initialValue 时初始内容为空字符串", () => {
    render(<InlineReplyEditor placeholder="写点什么" onSubmit={vi.fn().mockResolvedValue(true)} />);
    expect(screen.getByTestId("textarea")).toHaveValue("");
  });

  it("渲染传入的 header", () => {
    render(
      <InlineReplyEditor
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
    render(<InlineReplyEditor placeholder="写点什么" onSubmit={onSubmit} />);

    await user.type(screen.getByTestId("textarea"), "  hello  ");
    await user.click(screen.getByText("发送"));

    expect(onSubmit).toHaveBeenCalledWith("hello");
  });

  it("内容为空白时点击发送不调用 onSubmit", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(true);
    render(<InlineReplyEditor placeholder="写点什么" onSubmit={onSubmit} />);

    await user.type(screen.getByTestId("textarea"), "   ");
    await user.click(screen.getByText("发送"));

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("提交进行中 RichCommentInput 收到 isSubmitting=true", async () => {
    const user = userEvent.setup();
    let resolveSubmit!: (v: boolean) => void;
    const onSubmit = vi.fn(() => new Promise<boolean>((resolve) => (resolveSubmit = resolve)));
    render(<InlineReplyEditor placeholder="写点什么" onSubmit={onSubmit} />);

    await user.type(screen.getByTestId("textarea"), "hello");
    await user.click(screen.getByText("发送"));

    expect(screen.getByText("发送")).toBeDisabled();
    resolveSubmit(true);
  });
});

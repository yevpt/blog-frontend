import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { InlineFieldEditor } from "./inline-field-editor";

const noop = async () => {};

describe("InlineFieldEditor", () => {
  it("渲染不崩溃，显示初始值", () => {
    render(<InlineFieldEditor initialValue="test" onSave={noop} onCancel={noop} />);
    expect(screen.getByDisplayValue("test")).toBeInTheDocument();
  });

  it("点击取消调用 onCancel", async () => {
    const onCancel = vi.fn();
    render(<InlineFieldEditor initialValue="" onSave={noop} onCancel={onCancel} />);
    await userEvent.click(screen.getByLabelText("取消"));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("有校验错误时保存按钮禁用", () => {
    render(
      <InlineFieldEditor
        initialValue=""
        onSave={noop}
        onCancel={noop}
        validate={(v) => (v.trim() === "" ? "不能为空" : null)}
      />,
    );
    expect(screen.getByLabelText("保存")).toBeDisabled();
    expect(screen.getByText("不能为空")).toBeInTheDocument();
  });

  it("保存成功后状态重置", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<InlineFieldEditor initialValue="hello" onSave={onSave} onCancel={noop} />);
    await userEvent.click(screen.getByLabelText("保存"));
    await waitFor(() => expect(onSave).toHaveBeenCalledWith("hello"));
  });

  it("保存失败显示错误信息", async () => {
    const onSave = vi.fn().mockRejectedValue(new Error("服务器错误"));
    render(<InlineFieldEditor initialValue="hello" onSave={onSave} onCancel={noop} />);
    await userEvent.click(screen.getByLabelText("保存"));
    await waitFor(() => expect(screen.getByText("服务器错误")).toBeInTheDocument());
  });

  it("传入 maxLength 时 input 元素带 maxLength 属性", () => {
    render(<InlineFieldEditor initialValue="hi" onSave={noop} onCancel={noop} maxLength={150} />);
    expect(screen.getByDisplayValue("hi")).toHaveAttribute("maxLength", "150");
  });

  it("未传 maxLength 时 input 不带 maxLength 属性", () => {
    render(<InlineFieldEditor initialValue="hi" onSave={noop} onCancel={noop} />);
    expect(screen.getByDisplayValue("hi")).not.toHaveAttribute("maxLength");
  });
});

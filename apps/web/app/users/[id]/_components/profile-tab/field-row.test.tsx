import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FieldRow } from "./field-row";

const baseProps = {
  label: "邮箱",
  value: "test@example.com",
  isEditMode: false,
  isOwner: false,
  onSave: vi.fn().mockResolvedValue(undefined),
  isActiveEditing: false,
  isAnyEditing: false,
  onActivate: vi.fn(),
  onDeactivate: vi.fn(),
};

describe("FieldRow", () => {
  it("渲染不崩溃", () => {
    render(<FieldRow {...baseProps} />);
    expect(screen.getByText("test@example.com")).toBeInTheDocument();
  });

  it("只读模式下空值且无 emptyText 不渲染", () => {
    const { container } = render(<FieldRow {...baseProps} value={null} isEditMode={false} />);
    expect(container.firstChild).toBeNull();
  });

  it("只读模式下空值有 emptyText 不渲染（非本人）", () => {
    const { container } = render(
      <FieldRow {...baseProps} value={null} isOwner={false} emptyText="+ 添加" />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("编辑模式下本人空值显示 emptyText", () => {
    render(<FieldRow {...baseProps} value={null} isOwner isEditMode emptyText="+ 添加邮箱" />);
    expect(screen.getByText("+ 添加邮箱")).toBeInTheDocument();
  });

  it("非本人编辑模式下不显示铅笔图标", () => {
    render(<FieldRow {...baseProps} isOwner={false} isEditMode />);
    expect(screen.queryByLabelText("编辑邮箱")).not.toBeInTheDocument();
  });

  it("本人编辑模式显示铅笔图标", () => {
    render(<FieldRow {...baseProps} isOwner isEditMode />);
    expect(screen.getByLabelText("编辑邮箱")).toBeInTheDocument();
  });

  it("激活编辑态显示输入框", () => {
    render(<FieldRow {...baseProps} isOwner isEditMode isActiveEditing />);
    expect(screen.getByDisplayValue("test@example.com")).toBeInTheDocument();
  });

  it("点击铅笔图标调用 onActivate", async () => {
    const onActivate = vi.fn();
    render(<FieldRow {...baseProps} isOwner isEditMode onActivate={onActivate} />);
    await userEvent.click(screen.getByLabelText("编辑邮箱"));
    expect(onActivate).toHaveBeenCalledTimes(1);
  });

  it("isAnyEditing 且非激活态时铅笔按钮被禁用", () => {
    render(<FieldRow {...baseProps} isOwner isEditMode isAnyEditing isActiveEditing={false} />);
    expect(screen.getByLabelText("编辑邮箱")).toBeDisabled();
  });
});

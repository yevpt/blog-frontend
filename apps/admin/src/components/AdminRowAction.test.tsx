import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AdminRowAction, AdminRowActions } from "./AdminRowAction";

describe("AdminRowAction", () => {
  it("渲染统一的紧凑行内操作并响应点击", async () => {
    const user = userEvent.setup();
    const onPress = vi.fn();

    render(<AdminRowAction onPress={onPress}>编辑</AdminRowAction>);

    const button = screen.getByRole("button", { name: "编辑" });
    expect(button).toHaveClass("h-7", "text-muted-foreground", "shadow-none");

    await user.click(button);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("危险操作使用克制的破坏性色彩", () => {
    render(<AdminRowAction tone="destructive">删除</AdminRowAction>);

    expect(screen.getByRole("button", { name: "删除" })).toHaveClass("text-destructive/80");
  });
});

describe("AdminRowActions", () => {
  it("默认将操作组靠右排列", () => {
    render(
      <AdminRowActions aria-label="行操作">
        <span>操作</span>
      </AdminRowActions>,
    );

    expect(screen.getByLabelText("行操作")).toHaveClass("justify-end", "gap-0.5");
  });
});

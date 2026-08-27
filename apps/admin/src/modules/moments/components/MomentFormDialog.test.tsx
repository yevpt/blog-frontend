import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MomentFormDialog } from "./MomentFormDialog";

describe("MomentFormDialog", () => {
  it("使用统一弹窗层级并提供独立滚动正文", () => {
    render(
      <MomentFormDialog
        mode="create"
        open
        moment={null}
        isSubmitting={false}
        onClose={vi.fn()}
        onSubmit={vi.fn().mockResolvedValue(undefined)}
      />,
    );

    const heading = screen.getByRole("heading", { name: "新建碎语" });
    expect(screen.getByText("即时内容")).toBeInTheDocument();
    expect(heading.closest("header")).toHaveClass("px-4", "sm:px-6", "border-b");
    expect(screen.getByRole("button", { name: "关闭碎语表单" })).toBeInTheDocument();
    expect(screen.getByLabelText("碎语内容")).toHaveClass("min-h-40", "shadow-xs");
    expect(screen.getByRole("button", { name: "创建" }).closest("footer")).toHaveClass(
      "bg-muted/15",
    );
  });
});

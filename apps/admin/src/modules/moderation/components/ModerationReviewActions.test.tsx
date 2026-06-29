import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ModerationReviewActions } from "./ModerationReviewActions";

const baseProps = {
  mode: "approve" as const,
  reason: "",
  correctContent: "",
  validationError: null,
  submitError: null,
  canReview: true,
  canHide: false,
  canRestore: false,
  isSaving: false,
  onModeChange: vi.fn(),
  onReasonChange: vi.fn(),
  onCorrectContentChange: vi.fn(),
  onClose: vi.fn(),
  onSubmit: vi.fn(),
};

describe("ModerationReviewActions", () => {
  it("不展示步骤序号前缀", () => {
    render(<ModerationReviewActions {...baseProps} />);

    expect(screen.getByText("选择操作")).toBeInTheDocument();
    expect(screen.queryByText("1. 选择操作")).toBeNull();
    expect(screen.getByRole("button", { name: "确认通过" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "2. 确认通过" })).toBeNull();
  });

  it("移动端隐藏底部关闭按钮，确认按钮占满宽度", () => {
    render(<ModerationReviewActions {...baseProps} />);

    const closeButton = screen.getByRole("button", { name: "关闭" });
    const submitButton = screen.getByRole("button", { name: "确认通过" });

    expect(closeButton.className).toContain("hidden");
    expect(closeButton.className).toContain("md:inline-flex");
    expect(submitButton.className).toContain("w-full");
    expect(submitButton.className).toContain("md:w-auto");
  });
});

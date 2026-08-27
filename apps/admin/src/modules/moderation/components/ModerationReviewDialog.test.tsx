import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ModerationRow } from "../model";
import { ModerationReviewDialog } from "./ModerationReviewDialog";

vi.mock("./ModerationReviewDetails", () => ({
  ModerationReviewDetails: () => <div>审核详情内容</div>,
}));

vi.mock("./ModerationHistory", () => ({
  ModerationHistory: () => <div>审核历史内容</div>,
}));

const item: ModerationRow = {
  rowId: "100:200",
  itemId: 100,
  authorId: 42,
  lockVersion: 3,
  revisionId: 200,
  revisionVersion: 2,
  lifecycleState: "active",
  publicState: "placeholder",
  reviewStatus: "pending",
  riskLevel: "medium",
  policyAction: "post_review",
  contentTypeLabel: "碎语",
  contentType: "moment",
  riskLabel: "中风险",
  policyLabel: "审后通过",
  reviewLabel: "待审核",
  publicStateLabel: "占位",
  summary: "新提交内容",
  submittedContent: "新提交内容",
  publishedContent: "已发布内容",
  createdAt: "2026/06/29 16:00",
};

describe("ModerationReviewDialog", () => {
  it("桌面和移动端均提供页头关闭入口", () => {
    render(
      <ModerationReviewDialog
        open
        item={item}
        isSaving={false}
        submitError={null}
        onClose={vi.fn()}
        onApprove={vi.fn()}
        onReject={vi.fn()}
        onCorrect={vi.fn()}
        onHide={vi.fn()}
        onRestore={vi.fn()}
      />,
    );

    const heading = screen.getByRole("heading", { name: "审核 #100 · 碎语" });
    expect(screen.getByText("内容治理")).toBeInTheDocument();
    expect(heading.closest("header")).toHaveClass("sm:px-6", "bg-card/95");
    expect(screen.getByRole("button", { name: "关闭审核详情" })).toBeInTheDocument();
    expect(screen.getByRole("tablist", { name: "审核详情页签" }).parentElement).toHaveClass(
      "sm:px-6",
    );
  });
});

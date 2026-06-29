import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { ModerationView } from "@repo/api";
import { ModerationStatusBadge } from "./moderation-status-badge";

function moderation(overrides: Partial<ModerationView> = {}): ModerationView {
  return {
    public_state: "visible",
    display_version: "pending",
    has_pending_revision: true,
    pending_risk_level: "low",
    review_status: "pending",
    can_interact: false,
    ...overrides,
  };
}

describe("ModerationStatusBadge", () => {
  it("低风险先发后审内容显示待审核", () => {
    render(<ModerationStatusBadge moderation={moderation()} />);

    expect(screen.getByText("待审核")).toBeInTheDocument();
  });

  it("中风险占位内容显示等待人工审核", () => {
    render(
      <ModerationStatusBadge
        moderation={moderation({ public_state: "placeholder", pending_risk_level: "medium" })}
      />,
    );

    expect(screen.getByText("等待人工审核")).toBeInTheDocument();
  });

  it("审核驳回仅作者可见时显示审核未通过", () => {
    render(
      <ModerationStatusBadge
        moderation={moderation({
          public_state: "hidden",
          display_version: "none",
          has_pending_revision: false,
          review_status: "rejected",
          can_interact: false,
        })}
      />,
    );

    expect(screen.getByText("审核未通过")).toBeInTheDocument();
  });

  it("没有待审版本的可见内容不渲染状态", () => {
    const { container } = render(
      <ModerationStatusBadge
        moderation={moderation({
          display_version: "last_approved",
          has_pending_revision: false,
          pending_risk_level: undefined,
          review_status: undefined,
          can_interact: true,
        })}
      />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("审核关闭或旧响应缺少审核对象时按普通可见内容兼容", () => {
    const { container } = render(<ModerationStatusBadge moderation={undefined} />);

    expect(container).toBeEmptyDOMElement();
  });
});

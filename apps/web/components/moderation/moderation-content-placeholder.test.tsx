import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { ModerationView } from "@repo/api";
import { ModerationContentPlaceholder } from "./moderation-content-placeholder";

describe("ModerationContentPlaceholder", () => {
  it("中风险内容显示安全占位且不泄露待审正文", () => {
    const moderation: ModerationView = {
      public_state: "placeholder",
      display_version: "none",
      has_pending_revision: true,
      pending_risk_level: "medium",
      review_status: "pending",
      pending_content: "不应公开的待审正文",
      can_interact: false,
    };

    render(<ModerationContentPlaceholder moderation={moderation} />);

    expect(screen.getByRole("status")).toHaveTextContent("内容存在风险，正在等待人工审核");
    expect(screen.queryByText("不应公开的待审正文")).not.toBeInTheDocument();
  });
});

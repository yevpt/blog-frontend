import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { AdminListSummary } from "./AdminListSummary";

describe("AdminListSummary", () => {
  it("渲染条数与次要统计", () => {
    render(
      <AdminListSummary visibleCount={12} secondary="关联 32 篇公开文章" />,
    );

    expect(screen.getByText("共 12 条")).toBeInTheDocument();
    expect(screen.getByText("关联 32 篇公开文章")).toBeInTheDocument();
  });

  it("无次要统计时只显示条数", () => {
    render(<AdminListSummary visibleCount={0} />);

    expect(screen.getByText("共 0 条")).toBeInTheDocument();
    expect(screen.queryByText(/关联/)).not.toBeInTheDocument();
  });
});

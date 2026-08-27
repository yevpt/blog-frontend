import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Button } from "@repo/ui";
import { AdminPanel } from "./AdminPanel";

describe("AdminPanel", () => {
  it("统一渲染标题、说明、操作与内容区", () => {
    render(
      <AdminPanel title="流量趋势" description="按访问日期汇总" action={<Button>导出</Button>}>
        图表内容
      </AdminPanel>,
    );

    expect(screen.getByRole("heading", { name: "流量趋势", level: 2 })).toBeInTheDocument();
    expect(screen.getByText("按访问日期汇总")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "导出" })).toBeInTheDocument();
    expect(screen.getByText("图表内容")).toHaveClass("p-4", "sm:p-5");
  });

  it("无页头时不渲染空 header", () => {
    const { container } = render(<AdminPanel>内容</AdminPanel>);

    expect(container.querySelector("header")).toBeNull();
  });
});

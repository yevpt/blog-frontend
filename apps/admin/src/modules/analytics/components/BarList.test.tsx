import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { BarList } from "./BarList";

describe("BarList", () => {
  it("空数据时显示空态文案", () => {
    render(<BarList items={[]} emptyText="没有维度数据" />);

    expect(screen.getByText("没有维度数据")).toBeInTheDocument();
  });

  it("按最大值计算条形宽度并展示 hint", () => {
    render(
      <BarList
        items={[
          { label: "直接访问", value: 20, hint: "80%" },
          { label: "搜索引擎", value: 10 },
        ]}
      />,
    );

    expect(screen.getByText("直接访问")).toBeInTheDocument();
    expect(screen.getByText("80%")).toBeInTheDocument();
    expect(
      screen.getAllByRole("generic").some((node) => node.getAttribute("style") === "width: 50%;"),
    ).toBe(true);
  });
});

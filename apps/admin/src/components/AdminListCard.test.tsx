import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { AdminListCard } from "./AdminListCard";

describe("AdminListCard", () => {
  it("使用 Card 并保留默认环境阴影", () => {
    const { container } = render(
      <AdminListCard>
        <p>列表内容</p>
      </AdminListCard>,
    );

    const card = container.firstElementChild;
    expect(card).toHaveClass("rounded-xl");
    expect(card).toHaveClass("bg-card");
    expect(card).toHaveClass("shadow-card");
    expect(card).not.toHaveClass("shadow-none");
    expect(card).toHaveClass("border");
    expect(card).toHaveClass("divide-y");
    expect(card).toHaveClass("overflow-hidden");
    expect(card).not.toHaveClass("ring-1");
    expect(screen.getByText("列表内容")).toBeInTheDocument();
  });
});

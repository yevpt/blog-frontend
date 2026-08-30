import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AdminRouteLoading } from "./AdminRouteLoading";

describe("AdminRouteLoading", () => {
  it("以状态文本提示页面仍在加载", () => {
    render(<AdminRouteLoading />);

    expect(screen.getByRole("status")).toHaveTextContent("正在加载页面");
  });
});

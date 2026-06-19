import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Badge } from "./badge";

describe("Badge", () => {
  it("渲染不崩溃，显示文字", () => {
    render(<Badge>标签</Badge>);
    expect(screen.getByText("标签")).toBeTruthy();
  });

  it("brand variant 含 bg-primary/10", () => {
    const { container } = render(<Badge variant="brand">品牌</Badge>);
    expect(container.querySelector("span")?.className).toContain("bg-primary/10");
  });

  it("outline variant 含 border-border", () => {
    const { container } = render(<Badge variant="outline">边框</Badge>);
    expect(container.querySelector("span")?.className).toContain("border-border");
  });

  it("success variant 含 bg-green", () => {
    const { container } = render(<Badge variant="success">成功</Badge>);
    expect(container.querySelector("span")?.className).toContain("bg-green-100");
  });

  it("className 透传", () => {
    const { container } = render(<Badge className="custom-cls">自定义</Badge>);
    expect(container.querySelector("span")?.className).toContain("custom-cls");
  });
});
